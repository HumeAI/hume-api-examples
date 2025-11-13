import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'Agora Conversational AI with Hume TTS',
	description: 'Agora Real-time voice conversation with AI using Hume TTS',
	icons: {
		icon: [],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body>{children}</body>
		</html>
	);
}
