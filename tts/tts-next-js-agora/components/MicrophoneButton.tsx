'use client';

import { useEffect, useRef, useState } from 'react';
import type { IMicrophoneAudioTrack } from 'agora-rtc-react';
import { useRTCClient } from 'agora-rtc-react';

interface MicrophoneButtonProps {
	isEnabled: boolean;
	setIsEnabled: (state: boolean) => void;
	localMicrophoneTrack: IMicrophoneAudioTrack | null;
}

export function MicrophoneButton({
	isEnabled,
	setIsEnabled,
	localMicrophoneTrack,
}: MicrophoneButtonProps) {
	const client = useRTCClient();
	const [levels, setLevels] = useState<number[]>(Array(5).fill(0));
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (localMicrophoneTrack && isEnabled) {
			setupAnalyser();
		} else {
			teardownAnalyser();
		}

		return () => teardownAnalyser();
	}, [localMicrophoneTrack, isEnabled]);

	const setupAnalyser = async () => {
		if (!localMicrophoneTrack) return;

		try {
			audioContextRef.current = new AudioContext();
			analyserRef.current = audioContextRef.current.createAnalyser();
			analyserRef.current.fftSize = 64;

			const streamTrack = localMicrophoneTrack.getMediaStreamTrack();
			const source = audioContextRef.current.createMediaStreamSource(
				new MediaStream([streamTrack])
			);
			source.connect(analyserRef.current);

			updateLevels();
		} catch (error) {
			console.error('Failed to set up microphone analyser:', error);
		}
	};

	const teardownAnalyser = () => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}
		setLevels(Array(5).fill(0));
	};

	const updateLevels = () => {
		if (!analyserRef.current) return;

		const data = new Uint8Array(analyserRef.current.frequencyBinCount);
		analyserRef.current.getByteFrequencyData(data);

		const segmentSize = Math.floor(data.length / 5);
		const nextLevels = Array(5)
			.fill(0)
			.map((_, index) => {
				const start = index * segmentSize;
				const end = start + segmentSize;
				const slice = data.slice(start, end);
				const average =
					slice.reduce((sum, value) => sum + value, 0) / slice.length;
				return Math.min(1, average / 200);
			});

		setLevels(nextLevels);
		animationFrameRef.current = requestAnimationFrame(updateLevels);
	};

	const handleToggle = async () => {
		if (!localMicrophoneTrack) return;

		const next = !isEnabled;
		try {
			await localMicrophoneTrack.setEnabled(next);
			if (!next) {
				await client.unpublish(localMicrophoneTrack);
			} else {
				await client.publish(localMicrophoneTrack);
			}
			setIsEnabled(next);
		} catch (error) {
			console.error('Failed to toggle microphone:', error);
		}
	};

	return (
		<button
			onClick={handleToggle}
			style={{
				width: 64,
				height: 64,
				borderRadius: '50%',
				border: '1px solid black',
				backgroundColor: isEnabled ? 'white' : '#a00',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative',
				cursor: 'pointer',
			}}>
			<div
				style={{
					position: 'absolute',
					inset: 8,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 4,
				}}>
				{levels.map((level, idx) => (
					<div
						key={idx}
						style={{
							width: 4,
							height: `${Math.max(8, level * 48)}px`,
							borderRadius: 2,
							backgroundColor: isEnabled ? '#0a0' : '#666',
							transition: 'height 0.1s ease',
						}}
					/>
				))}
			</div>
			<div
				style={{
					position: 'relative',
					zIndex: 1,
					fontSize: 12,
					fontWeight: 600,
				}}>
				{isEnabled ? 'Mic' : 'Off'}
			</div>
		</button>
	);
}
