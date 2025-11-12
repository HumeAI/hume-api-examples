'use client';

import { useState } from 'react';

const JOIN_PAYLOAD = {
	name: 'sample-agent',
	properties: {
		channel: 'demo-channel',
		token:
			'007eJxTYMgs2VQyJ23pl6+eNfPeTo/6k/I6QqaiYKH36ZdXPr233nNUgcHE2CTN1MIs1SIp1cLE1MjY0tjEIjXFPCUlydTMxNjMkmW6cGZDICND2+2tzIwMEAjiszCUpBaXMDAAAGIRIro=',
		agent_rtc_uid: '1001',
		remote_rtc_uids: ['1002'],
		idle_timeout: 30,
		tts: {
			vendor: 'humeai',
			params: {
				voice_id: 'ebba4902-69de-4e01-9846-d8feba5a1a3f',
				provider: 'HUME_AI',
				trailing_silence: 0.35,
			},
		},
		llm: {
			url: 'https://api.openai.com/v1/chat/completions',
			params: {
				model: 'gpt-4o-mini',
			},
		},
	},
} as const;

export default function Home() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successResponse, setSuccessResponse] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [agentId, setAgentId] = useState<string | null>(null);
	const [chatMessages, setChatMessages] = useState<
		{ role: 'user' | 'agent' | 'system'; content: string }[]
	>([]);
	const [userMessage, setUserMessage] = useState('');
	const [chatError, setChatError] = useState<string | null>(null);
	const [isSendingMessage, setIsSendingMessage] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setErrorMessage(null);
		setSuccessResponse(null);
		setAgentId(null);
		setChatMessages([]);
		setChatError(null);

		try {
			const response = await fetch('/api/start-agent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(JOIN_PAYLOAD),
			});

			const data = await response.json();

			if (!response.ok) {
				const detail =
					typeof data === 'object'
						? JSON.stringify(data, null, 2)
						: String(data);
				setErrorMessage(detail);
				return;
			}

			setSuccessResponse(JSON.stringify(data, null, 2));
			if (
				data &&
				typeof data === 'object' &&
				typeof data.agent_id === 'string'
			) {
				setAgentId(data.agent_id);
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unexpected error submitting request.';
			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!agentId) {
			setChatError('Start the agent first to retrieve its `agent_id`.');
			return;
		}
		if (!userMessage.trim()) {
			return;
		}

		const newUserMessage = userMessage.trim();
		setUserMessage('');
		setChatError(null);
		setIsSendingMessage(true);
		setChatMessages((prev) => [
			...prev,
			{ role: 'user', content: newUserMessage },
		]);

		try {
			const response = await fetch('/api/agent-message', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					agentId,
					message: newUserMessage,
					limit: 10,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				const detail =
					typeof data === 'object'
						? JSON.stringify(data, null, 2)
						: String(data);
				setChatError(detail);
				return;
			}

			const history = Array.isArray(data.history) ? data.history : [];

			const formatted: {
				role: 'user' | 'agent' | 'system';
				content: string;
			}[] = history
				.filter(
					(entry: { role?: string; content?: string }) =>
						typeof entry.role === 'string' && typeof entry.content === 'string'
				)
				.map((entry: { role?: string; content?: string }) => {
					const role =
						entry.role === 'agent' || entry.role === 'user'
							? entry.role
							: 'system';
					return {
						role,
						content: entry.content as string,
					};
				});

			setChatMessages(formatted);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unexpected error sending message.';
			setChatError(message);
		} finally {
			setIsSendingMessage(false);
		}
	}

	return (
		<div className='flex min-h-screen justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-black'>
			<main className='flex w-full max-w-5xl flex-col gap-8 rounded-3xl border border-zinc-200 bg-white p-10 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950'>
				<header className='space-y-3'>
					<h1 className='text-3xl font-semibold text-black dark:text-zinc-50'>
						Start an Agora Conversational AI Agent
					</h1>
				</header>

				<form
					onSubmit={handleSubmit}
					className='flex justify-center items-center w-full'>
					<button
						type='submit'
						className='inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200'
						disabled={isSubmitting}>
						{isSubmitting ? 'Starting agent...' : 'Start agent'}
					</button>
				</form>

				<section className='flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white/60 p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60'>
					<header className='flex items-center justify-between'>
						<div>
							<h2 className='text-xl font-semibold text-black dark:text-zinc-50'>
								Text conversation
							</h2>
							<p className='text-sm text-zinc-500 dark:text-zinc-400'>
								Agent ID:{' '}
								<span className='font-mono text-xs text-zinc-700 dark:text-zinc-300'>
									{agentId ?? 'Not started'}
								</span>
							</p>
						</div>
					</header>

					<div className='flex h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/60'>
						{chatMessages.length === 0 ? (
							<p className='text-sm text-zinc-500 dark:text-zinc-400'>
								Start the agent and send a message to see the conversation log.
							</p>
						) : (
							chatMessages.map((message, index) => (
								<div key={`${message.role}-${index}`} className='flex flex-col'>
									<span className='text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
										{message.role}
									</span>
									<p className='whitespace-pre-wrap rounded-xl bg-zinc-100 p-3 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'>
										{message.content}
									</p>
								</div>
							))
						)}
					</div>

					<form
						onSubmit={handleSendMessage}
						className='flex flex-col gap-3 sm:flex-row sm:items-end'>
						<label className='flex w-full flex-col gap-2'>
							<span className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
								Message
							</span>
							<textarea
								value={userMessage}
								onChange={(event) => setUserMessage(event.target.value)}
								className='h-24 w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 shadow-inner focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-600'
								disabled={!agentId || isSendingMessage}
							/>
						</label>
						<button
							type='submit'
							className='inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200'
							disabled={!agentId || isSendingMessage}>
							{isSendingMessage ? 'Sending...' : 'Send message'}
						</button>
					</form>

					{chatError ? (
						<div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'>
							{chatError}
						</div>
					) : null}
				</section>

				{errorMessage ? (
					<section className='rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'>
						<strong className='block font-semibold'>Request failed</strong>
						<pre className='mt-2 overflow-x-auto whitespace-pre-wrap font-mono'>
							{errorMessage}
						</pre>
					</section>
				) : null}

				{successResponse ? (
					<section className='rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'>
						<strong className='block font-semibold'>Agent started</strong>
						<pre className='mt-2 overflow-x-auto whitespace-pre-wrap font-mono'>
							{successResponse}
						</pre>
					</section>
				) : null}
			</main>
		</div>
	);
}
