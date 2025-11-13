'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
	useRTCClient,
	useLocalMicrophoneTrack,
	useRemoteUsers,
	useClientEvent,
	useIsConnected,
	useJoin,
	usePublish,
	type UID,
	type IRemoteAudioTrack,
} from 'agora-rtc-react';
import { MicrophoneButton } from './MicrophoneButton';
import { AudioVisualizer } from './AudioVisualizer';
import ConvoTextStream from './ConvoTextStream';
import { MessageEngine, IMessageListItem, EMessageStatus } from '@/lib/message';
import type {
	ConversationComponentProps,
	StopConversationRequest,
	ClientStartRequest,
} from '@/types/conversation';

export default function ConversationComponent({
	agoraData,
	onTokenWillExpire,
	onEndConversation,
}: ConversationComponentProps) {
	const client = useRTCClient();
	const isConnected = useIsConnected();
	const remoteUsers = useRemoteUsers();
	const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
	const { localMicrophoneTrack } = useLocalMicrophoneTrack(microphoneEnabled);
	const [isAgentConnected, setIsAgentConnected] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const agentUID = process.env.NEXT_PUBLIC_AGENT_UID ?? '1000000002';
	const [joinedUID, setJoinedUID] = useState<UID>(0);
	const [messageList, setMessageList] = useState<IMessageListItem[]>([]);
	const [inProgressMessage, setInProgressMessage] =
		useState<IMessageListItem | null>(null);
	const messageEngineRef = useRef<MessageEngine | null>(null);
	const playedAudioTracksRef = useRef<Set<string>>(new Set());

	const { isConnected: joinSuccess } = useJoin(
		{
			appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
			channel: agoraData.channel,
			token: agoraData.token,
			uid: parseInt(agoraData.uid, 10),
		},
		true
	);

	useEffect(() => {
		if (!client || !isConnected) return;

		if (messageEngineRef.current) {
			try {
				messageEngineRef.current.cleanup();
			} catch (error) {
				console.error('Error cleaning up MessageEngine:', error);
			}
			messageEngineRef.current = null;
		}

		try {
			const engine = new MessageEngine(client, (updatedMessages) => {
				// Sort messages by turn_id to maintain order
				const sortedMessages = [...updatedMessages].sort(
					(a, b) => a.turn_id - b.turn_id
				);

				// Find the latest in-progress message
				const inProgressMsg = sortedMessages.find(
					(msg) => msg.status === EMessageStatus.IN_PROGRESS
				);

				// Update states
				setMessageList(
					sortedMessages.filter(
						(msg) => msg.status !== EMessageStatus.IN_PROGRESS
					)
				);
				setInProgressMessage(inProgressMsg || null);
			});
			messageEngineRef.current = engine;
		} catch (error) {
			console.error('Failed to initialise MessageEngine:', error);
		}

		return () => {
			if (messageEngineRef.current) {
				try {
					messageEngineRef.current.cleanup();
				} catch (error) {
					console.error('Error cleaning up MessageEngine:', error);
				}
				messageEngineRef.current = null;
			}
		};
	}, [client, isConnected]);

	useClientEvent(client, 'stream-message', (uid: UID, payload: Uint8Array) => {
		const uidStr = uid.toString();
		// Agora uses '333' as a special UID for stream messages from agents
		const isAgentStream = uidStr === agentUID || uidStr === '333';

		if (isAgentStream && messageEngineRef.current) {
			try {
				messageEngineRef.current.handleStreamMessage(payload);
			} catch (error) {
				console.error('Failed to handle stream message:', error);
			}
		} else if (isAgentStream && !messageEngineRef.current) {
			console.warn(
				'MessageEngine not initialized, cannot process agent stream message'
			);
		}
	});

	useEffect(() => {
		if (joinSuccess && client) {
			setJoinedUID(client.uid as UID);
		}
	}, [joinSuccess, client]);

	usePublish([localMicrophoneTrack]);

	useEffect(() => {
		if (localMicrophoneTrack) {
			localMicrophoneTrack.setEnabled(true);
		}
	}, [localMicrophoneTrack]);

	useClientEvent(client, 'user-joined', (user: { uid: UID }) => {
		if (user.uid.toString() === agentUID) {
			setIsAgentConnected(true);
			setIsConnecting(false);
		}
	});

	useClientEvent(client, 'user-left', (user: { uid: UID }) => {
		if (user.uid.toString() === agentUID) {
			setIsAgentConnected(false);
			setIsConnecting(false);
		}
	});

	// Subscribe to remote audio tracks when they're published
	useClientEvent(
		client,
		'user-published',
		async (user: { uid: UID }, mediaType: 'audio' | 'video') => {
			const uid = user.uid.toString();
			if (uid === agentUID && mediaType === 'audio' && client) {
				try {
					await client.subscribe(user, mediaType);
				} catch (error) {
					console.error(`Failed to subscribe to agent ${uid} audio:`, error);
				}
			}
		}
	);

	useEffect(() => {
		const agentPresent = remoteUsers.some(
			(user) => user.uid.toString() === agentUID
		);
		setIsAgentConnected(agentPresent);
	}, [remoteUsers, agentUID]);

	useEffect(() => {
		remoteUsers.forEach(
			(user: { uid: UID; audioTrack?: IRemoteAudioTrack }) => {
				const uid = user.uid.toString();
				if (uid !== agentUID) return;
				if (!user.audioTrack) return;

				// Ensure audio element exists in DOM
				let audioElement = document.getElementById(
					`agent-audio-${uid}`
				) as HTMLAudioElement;
				if (!audioElement) {
					audioElement = document.createElement('audio');
					audioElement.id = `agent-audio-${uid}`;
					audioElement.autoplay = true;
					audioElement.volume = 1.0;
					document.body.appendChild(audioElement);
				}

				if (!playedAudioTracksRef.current.has(uid)) {
					try {
						user.audioTrack.play();
						playedAudioTracksRef.current.add(uid);
					} catch (error) {
						console.error('Failed to play agent audio track:', error);
						// Try playing with the element ID as fallback
						try {
							user.audioTrack.play(`agent-audio-${uid}`);
							playedAudioTracksRef.current.add(uid);
						} catch (fallbackError) {
							console.error('Failed to play with element ID:', fallbackError);
						}
					}
				}
			}
		);

		const activeUids = new Set(remoteUsers.map((user) => user.uid.toString()));
		playedAudioTracksRef.current.forEach((uid) => {
			if (!activeUids.has(uid)) {
				// Clean up audio element when user leaves
				const audioElement = document.getElementById(`agent-audio-${uid}`);
				if (audioElement) {
					audioElement.remove();
				}
				playedAudioTracksRef.current.delete(uid);
			}
		});
	}, [remoteUsers, agentUID]);

	useClientEvent(
		client,
		'connection-state-change',
		(current: string, previous: string) => {
			if (current === 'DISCONNECTED') {
				// Connection will be automatically re-established by useJoin hook
			}
		}
	);

	useEffect(() => {
		return () => {
			client?.leave();
		};
	}, [client]);

	const handleStopConversation = async () => {
		if (!agoraData.agentId) return;
		try {
			const stopRequest: StopConversationRequest = {
				agent_id: agoraData.agentId,
			};

			const response = await fetch('/api/stop-conversation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(stopRequest),
			});

			if (!response.ok) {
				throw new Error(`Failed to stop conversation: ${response.statusText}`);
			}

			setIsAgentConnected(false);
			onEndConversation?.();
		} catch (error) {
			console.error('Error stopping conversation:', error);
		}
	};

	const handleStartConversation = async () => {
		if (!agoraData.agentId) return;
		setIsConnecting(true);

		try {
			const startRequest: ClientStartRequest = {
				requester_id: joinedUID?.toString(),
				channel_name: agoraData.channel,
				input_modalities: ['text'],
				output_modalities: ['text', 'audio'],
			};

			const response = await fetch('/api/invite-agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(startRequest),
			});

			if (!response.ok) {
				throw new Error(`Failed to start conversation: ${response.statusText}`);
			}

			const data = (await response.json()) as { agent_id?: string };
			if (data.agent_id) {
				agoraData.agentId = data.agent_id;
			}
		} catch (error) {
			console.error('Error starting conversation:', error);
			setIsConnecting(false);
		}
	};

	const handleMicrophoneToggle = async (state: boolean) => {
		setMicrophoneEnabled(state);
		if (state && !isAgentConnected) {
			await handleStartConversation();
		}
	};

	const handleTokenWillExpire = useCallback(async () => {
		if (!onTokenWillExpire || !joinedUID) return;
		try {
			const newToken = await onTokenWillExpire(joinedUID.toString());
			await client?.renewToken(newToken);
		} catch (error) {
			console.error('Failed to renew Agora token:', error);
		}
	}, [client, joinedUID, onTokenWillExpire]);

	useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 24,
				padding: 24,
				minHeight: '100%',
			}}>
			<header
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 16,
					borderBottom: '1px solid #ccc',
					paddingBottom: 16,
				}}>
				<div>
					<h2 style={{ fontSize: 20, marginBottom: 4 }}>Voice Conversation</h2>
					<p style={{ fontSize: 14, color: '#666' }}>
						Channel: <strong>{agoraData.channel}</strong> · UID:{' '}
						<strong>{agoraData.uid}</strong>
					</p>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<div
						style={{
							width: 10,
							height: 10,
							borderRadius: '50%',
							backgroundColor: isConnected ? '#0a0' : '#a00',
						}}
					/>
					<span style={{ fontSize: 14 }}>
						{isAgentConnected ? 'Agent connected' : 'Waiting for agent'}
					</span>
					<button
						onClick={
							isAgentConnected
								? handleStopConversation
								: handleStartConversation
						}
						disabled={isConnecting}
						style={{
							padding: '8px 16px',
							borderRadius: 4,
							border: '1px solid black',
							backgroundColor: 'black',
							color: 'white',
							cursor: 'pointer',
							fontSize: 14,
						}}>
						{isAgentConnected
							? isConnecting
								? 'Disconnecting…'
								: 'Stop Agent'
							: isConnecting
							? 'Connecting…'
							: 'Start Agent'}
					</button>
				</div>
			</header>

			<section
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					padding: 16,
					border: '1px solid #ccc',
				}}>
				<h3 style={{ margin: 0, fontSize: 16 }}>Agent Audio</h3>
				{remoteUsers.length === 0 ? (
					<p style={{ fontSize: 14, color: '#666' }}>
						Waiting for the agent to join the channel…
					</p>
				) : (
					remoteUsers.map((user) => (
						<div
							key={user.uid}
							style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<span style={{ fontSize: 14, fontWeight: 500 }}>
								Remote UID: {user.uid}
							</span>
							<AudioVisualizer track={user.audioTrack} />
						</div>
					))
				)}
			</section>

			<div
				style={{
					position: 'fixed',
					left: '50%',
					bottom: 32,
					transform: 'translateX(-50%)',
				}}>
				<MicrophoneButton
					isEnabled={microphoneEnabled}
					setIsEnabled={handleMicrophoneToggle}
					localMicrophoneTrack={localMicrophoneTrack}
				/>
			</div>

			<ConvoTextStream
				messageList={messageList}
				currentInProgressMessage={inProgressMessage}
				agentUID={agentUID}
			/>
		</div>
	);
}
