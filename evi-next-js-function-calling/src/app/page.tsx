// ./app/page.tsx
import ClientComponent from "@/components/ClientComponent";
import { fetchAccessToken } from "@humeai/voice";

export default async function Page() {
  console.log(process.env.NEXT_PUBLIC_HUME_API_KEY);
  console.log(process.env.NEXT_PUBLIC_HUME_CLIENT_SECRET);
  
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.NEXT_PUBLIC_HUME_API_KEY),
    clientSecret: String(process.env.NEXT_PUBLIC_HUME_CLIENT_SECRET),
  });

  if (!accessToken) {
    throw new Error();
  }

  return <ClientComponent accessToken={accessToken} />;
}
