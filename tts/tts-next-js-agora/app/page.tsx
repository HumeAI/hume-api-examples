'use client';

import { useCallback, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type {
	AgoraTokenData,
	ClientStartRequest,
	AgentResponse,
} from '@/types/conversation';

const ConversationComponent = dynamic(
	() => import('@/components/ConversationComponent'),
	{ ssr: false }
);

const AgoraProvider = dynamic(
	async () => {
		const { AgoraRTCProvider, default: AgoraRTC } = await import(
			'agora-rtc-react'
		);

		return {
			default: ({ children }: { children: React.ReactNode }) => {
				const client = useMemo(
					() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }),
					[]
				);
				return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
			},
		};
	},
	{ ssr: false }
);

export default function Page() {
	const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleStartConversation = useCallback(async () => {
		setIsStarting(true);
		setError(null);

		try {
			const tokenResponse = await fetch('/api/generate-agora-token');
			const tokenPayload = await tokenResponse.json();

			if (!tokenResponse.ok) {
				throw new Error(
					typeof tokenPayload === 'object'
						? JSON.stringify(tokenPayload)
						: String(tokenPayload)
				);
			}

			const startRequest: ClientStartRequest = {
				requester_id: tokenPayload.uid,
				channel_name: tokenPayload.channel,
				token: tokenPayload.token,
				input_modalities: ['text'],
				output_modalities: ['text', 'audio'],
			};

			const inviteResponse = await fetch('/api/invite-agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(startRequest),
			});

			if (!inviteResponse.ok) {
				const invitePayload = await inviteResponse.json();
				throw new Error(
					typeof invitePayload === 'object'
						? JSON.stringify(invitePayload)
						: String(invitePayload)
				);
			}

			const agentData = (await inviteResponse.json()) as AgentResponse;

			setAgoraData({
				token: tokenPayload.token,
				uid: tokenPayload.uid,
				channel: tokenPayload.channel,
				agentId: agentData.agent_id,
			});
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to start conversation';
			setError(message);
			setAgoraData(null);
		} finally {
			setIsStarting(false);
		}
	}, []);

	const handleRenewToken = useCallback(
		async (uid: string) => {
			const response = await fetch(
				`/api/generate-agora-token?channel=${agoraData?.channel}&uid=${uid}`
			);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(
					typeof payload === 'object'
						? JSON.stringify(payload)
						: String(payload)
				);
			}
			return payload.token as string;
		},
		[agoraData?.channel]
	);

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 24,
				padding: 24,
				background: '#0f172a',
				color: '#e2e8f0',
			}}>
			<div style={{ textAlign: 'center', maxWidth: 480 }}>
				<h1 style={{ fontSize: 32, marginBottom: 12 }}>
					Hume Conversational AI
				</h1>
				<p style={{ fontSize: 16, color: '#94a3b8' }}>
					Start a live conversation with the Agora Conversational AI agent
					powered by Hume TTS.
				</p>
			</div>

			{!agoraData ? (
				<>
					<button
						onClick={handleStartConversation}
						disabled={isStarting}
						style={{
							padding: '12px 32px',
							borderRadius: 999,
							border: 'none',
							backgroundColor: '#2563eb',
							color: '#ffffff',
							fontSize: 16,
							cursor: 'pointer',
						}}>
						{isStarting ? 'Starting…' : 'Start Conversation'}
					</button>
					{error && (
						<p style={{ color: '#f97316', maxWidth: 400, textAlign: 'center' }}>
							{error}
						</p>
					)}
				</>
			) : (
				<Suspense fallback={<p>Loading conversation…</p>}>
					<AgoraProvider>
						<div
							style={{
								width: '100%',
								maxWidth: 960,
								minHeight: 600,
								borderRadius: 16,
								backgroundColor: '#ffffff',
								color: '#0f172a',
								boxShadow: '0 24px 60px rgba(15, 23, 42, 0.4)',
								position: 'relative',
							}}>
							<ConversationComponent
								agoraData={agoraData}
								onTokenWillExpire={handleRenewToken}
								onEndConversation={() => setAgoraData(null)}
							/>
						</div>
					</AgoraProvider>
				</Suspense>
			)}
		</div>
	);
}
