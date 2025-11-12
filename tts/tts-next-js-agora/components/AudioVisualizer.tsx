'use client';

import { useEffect, useRef } from 'react';
import type { ILocalAudioTrack, IRemoteAudioTrack } from 'agora-rtc-react';

interface AudioVisualizerProps {
	track: ILocalAudioTrack | IRemoteAudioTrack | undefined;
}

export function AudioVisualizer({ track }: AudioVisualizerProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const animationRef = useRef<number | undefined>(undefined);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);

	useEffect(() => {
		if (!track) {
			return;
		}

		const setup = async () => {
			try {
				audioContextRef.current = new AudioContext();
				analyserRef.current = audioContextRef.current.createAnalyser();
				analyserRef.current.fftSize = 256;
				analyserRef.current.smoothingTimeConstant = 0.6;

				if (!('getMediaStreamTrack' in track)) {
					return;
				}
				const mediaStreamTrack = track.getMediaStreamTrack();
				const source = audioContextRef.current.createMediaStreamSource(
					new MediaStream([mediaStreamTrack])
				);
				source.connect(analyserRef.current);

				draw();
			} catch (error) {
				console.error('Failed to initialise audio visualiser:', error);
			}
		};

		setup();

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, [track]);

	const draw = () => {
		if (!canvasRef.current || !analyserRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const bufferLength = analyserRef.current.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		analyserRef.current.getByteFrequencyData(dataArray);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const barWidth = (canvas.width / bufferLength) * 1.5;
		let x = 0;

		for (let i = 0; i < bufferLength; i += 1) {
			const barHeight = (dataArray[i] / 255) * canvas.height;
			ctx.fillStyle = 'black';
			ctx.fillRect(
				x,
				canvas.height - barHeight,
				barWidth,
				Math.max(1, barHeight)
			);
			x += barWidth + 1;
		}

		animationRef.current = requestAnimationFrame(draw);
	};

	return (
		<canvas
			ref={canvasRef}
			width={320}
			height={80}
			style={{
				width: '100%',
				maxWidth: '360px',
				height: '80px',
				border: '1px solid #ccc',
				backgroundColor: 'white',
			}}
		/>
	);
}
