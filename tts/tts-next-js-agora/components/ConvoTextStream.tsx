'use client';

import { useEffect, useRef } from 'react';
import type { IMessageListItem } from '@/lib/message';
import { EMessageStatus } from '@/lib/message';

interface Props {
	messageList: IMessageListItem[];
	currentInProgressMessage?: IMessageListItem | null;
	agentUID?: string;
}

export default function ConvoTextStream({
	messageList,
	currentInProgressMessage = null,
	agentUID,
}: Props) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [messageList, currentInProgressMessage?.text]);

	const entries = [...messageList];
	if (
		currentInProgressMessage &&
		currentInProgressMessage.status === EMessageStatus.IN_PROGRESS &&
		currentInProgressMessage.text.trim().length > 0
	) {
		entries.push(currentInProgressMessage);
	}

	const isAgentMessage = (message: IMessageListItem) => {
		if (message.uid === 0) return true;
		if (agentUID) {
			return message.uid.toString() === agentUID;
		}
		return false;
	};

	return (
		<div
			ref={containerRef}
			style={{
				position: 'fixed',
				right: 24,
				bottom: 120,
				width: 320,
				maxHeight: 320,
				padding: 16,
				border: '1px solid #ccc',
				backgroundColor: 'white',
				color: 'black',
				overflowY: 'auto',
			}}>
			<h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
				Conversation
			</h3>
			{entries.length === 0 ? (
				<p style={{ fontSize: 14, color: '#666' }}>
					Start speaking to see the agent responses here.
				</p>
			) : (
				<ul
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 12,
						margin: 0,
						padding: 0,
					}}>
					{entries.map((message, index) => (
						<li
							key={`${message.turn_id}-${index}`}
							style={{
								listStyle: 'none',
								padding: 12,
								border: '1px solid #ccc',
								backgroundColor: isAgentMessage(message) ? '#f5f5f5' : 'white',
							}}>
							<div
								style={{
									fontSize: 12,
									fontWeight: 600,
									marginBottom: 4,
								}}>
								{isAgentMessage(message) ? 'AI Agent' : 'You'}
								{message.status === EMessageStatus.IN_PROGRESS
									? ' (typing...)'
									: ''}
							</div>
							<div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
								{message.text}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
