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
				borderRadius: 12,
				backgroundColor: '#f1f5f9',
				color: '#0f172a',
				overflowY: 'auto',
				boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
			}}>
			<h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
				Conversation
			</h3>
			{entries.length === 0 ? (
				<p style={{ fontSize: 14, color: '#475569' }}>
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
								borderRadius: 8,
								backgroundColor: isAgentMessage(message)
									? '#e0f2fe'
									: '#e5e7eb',
							}}>
							<div
								style={{
									fontSize: 12,
									fontWeight: 600,
									letterSpacing: 0.5,
									color: '#334155',
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
