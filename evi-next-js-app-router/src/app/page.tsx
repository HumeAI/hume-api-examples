// ./app/page.tsx
import ClientComponent from '@/components/ClientComponent';
import { fetchAccessToken } from '@humeai/voice';

export default async function Page() {
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  if (!accessToken) {
    throw new Error();
  }

  return <ClientComponent accessToken={accessToken} />;
}
