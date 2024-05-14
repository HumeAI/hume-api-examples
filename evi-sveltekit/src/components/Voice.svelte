<script lang="ts">
	import {
		Hume,
		HumeClient,
		convertBlobToBase64,
		convertBase64ToBlob,
		ensureSingleValidAudioTrack,
		getAudioStream,
		getBrowserSupportedMimeType,
		MimeType
	} from 'hume';

	let client: HumeClient | null = null;
	let socket: Hume.empathicVoice.StreamSocket | null = null;
	let recorder: MediaRecorder | null = null;
	let audioStream: MediaStream | null = null;
	let currentAudio: HTMLAudioElement | null = null;
	let isPlaying = false;

	let messages: { role: string; message: string; timestamp: Date }[] = [];

	const audioQueue: Blob[] = [];

	const mimeType: MimeType = (() => {
		const result = getBrowserSupportedMimeType();
		return result.success ? result.mimeType : MimeType.WEBM;
	})();

	async function connect(): Promise<void> {
		// instantiate the HumeClient with credentials to make authenticated requests
		if (!client) {
			client = new HumeClient({
				apiKey: import.meta.env.VITE_HUME_API_KEY || '',
				clientSecret: import.meta.env.VITE_HUME_CLIENT_SECRET || ''
			});
		}

		// instantiates WebSocket and establishes an authenticated connection
		socket = await client.empathicVoice.chat.connect({
			onOpen: handleWebSocketOpenEvent,
			onMessage: handleWebSocketMessageEvent,
			onError: handleWebSocketErrorEvent,
			onClose: handleWebSocketCloseEvent
		});
	}

	function disconnect(): void {
		// stop audio playback
		stopAudio();

		// stop audio capture
		recorder?.stop();
		recorder = null;
		audioStream = null;

		// closed the Web Socket connection
		socket?.close();
	}

	async function captureAudio(): Promise<void> {
		audioStream = await getAudioStream();
		// ensure there is only one audio track in the stream
		ensureSingleValidAudioTrack(audioStream);

		// instantiate the media recorder
		recorder = new MediaRecorder(audioStream, { mimeType });

		// callback for when recorded chunk is available to be processed
		recorder.ondataavailable = async ({ data }) => {
			// IF size of data is smaller than 1 byte then do nothing
			if (data.size < 1) return;

			// base64 encode audio data
			const encodedAudioData = await convertBlobToBase64(data);

			// define the audio_input message JSON
			const audioInput: Omit<Hume.empathicVoice.AudioInput, 'type'> = {
				data: encodedAudioData
			};

			// send audio_input message
			socket?.sendAudioInput(audioInput);
		};

		// capture audio input at a rate of 100ms (recommended)
		const timeSlice = 100;
		recorder.start(timeSlice);
	}

	function playAudio(): void {
		// IF there is nothing in the audioQueue OR audio is currently playing then do nothing
		if (!audioQueue.length || isPlaying) return;

		// update isPlaying state
		isPlaying = true;

		// pull next audio output from the queue
		const audioBlob = audioQueue.shift();

		// IF audioBlob is unexpectedly undefined then do nothing
		if (!audioBlob) return;

		// converts Blob to AudioElement for playback
		const audioUrl = URL.createObjectURL(audioBlob);
		currentAudio = new Audio(audioUrl);

		// play audio
		currentAudio.play();

		// callback for when audio finishes playing
		currentAudio.onended = () => {
			// update isPlaying state
			isPlaying = false;

			// attempt to pull next audio output from queue
			if (audioQueue.length) playAudio();
		};
	}

	function stopAudio(): void {
		// stop the audio playback
		currentAudio?.pause();
		currentAudio = null;

		// update audio playback state
		isPlaying = false;

		// clear the audioQueue
		audioQueue.length = 0;
	}

	async function handleWebSocketOpenEvent(): Promise<void> {
		/* place logic here which you would like invoked when the socket opens */
		console.log('Web socket connection opened');
		await captureAudio();
	}

	function handleWebSocketMessageEvent(message: Hume.empathicVoice.SubscribeEvent): void {
		/* place logic here which you would like to invoke when receiving a message through the socket */

		// handle messages received through the WebSocket (messages are distinguished by their "type" field.)
		switch (message.type) {
			// append user and assistant messages to UI for chat visibility
			case 'user_message':
			case 'assistant_message':
				const { role, content } = message.message;

				messages = [...messages].concat([{ role, message: content, timestamp: new Date() }]);
				break;

			// add received audio to the playback queue, and play next audio output
			case 'audio_output':
				// convert base64 encoded audio to a Blob
				const audioOutput = message.data;
				const blob = convertBase64ToBlob(audioOutput, mimeType);

				// add audio Blob to audioQueue
				audioQueue.push(blob);

				// play the next audio output
				if (audioQueue.length === 1) playAudio();
				break;

			// stop audio playback, clear audio playback queue, and update audio playback state on interrupt
			case 'user_interruption':
				stopAudio();
				break;
		}
	}

	function handleWebSocketErrorEvent(error: Hume.empathicVoice.WebSocketError): void {
		/* place logic here which you would like invoked when receiving an error through the socket */
		console.error(error);
	}

	function handleWebSocketCloseEvent(): void {
		/* place logic here which you would like invoked when the socket closes */
		console.log('Web socket connection closed');
	}
</script>

<div class="controls">
    <button on:click={connect}>Start</button>
    <button on:click={disconnect}>Stop</button>
</div>

<div class="message-container">
	{#each messages as { role, message }}
		<div class="message" class:role-user={role === 'user'}>
			<div class="sender">{role}</div>
			<div>{message}</div>
		</div>
	{/each}
</div>

<style>
    .controls {
        padding: 1rem;
    }

	.message-container {
        padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 500px;
	}

	.message-container .message {
		width: 80%;
		background-color: #eeeeee;
		padding: 0.5rem;
		border-radius: 0.5rem;
		font-family: sans-serif;
	}

	.message-container .message.role-user {
		margin-left: auto;
		background-color: #007aff;
        color: #FFFFFF;
	}

    .message-container .message .sender {
        font-size: 0.8rem;
    }
</style>
