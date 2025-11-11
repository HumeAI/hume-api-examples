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

const JOIN_PAYLOAD_JSON = JSON.stringify(JOIN_PAYLOAD, null, 2);

export default function Home() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successResponse, setSuccessResponse] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setErrorMessage(null);
		setSuccessResponse(null);

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
