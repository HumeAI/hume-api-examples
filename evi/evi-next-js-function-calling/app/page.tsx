import { fetchAccessToken } from "hume";
import ChatLoader from "@/components/ChatLoader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  return (
    <div className={"grow flex flex-col"}>
      <ChatLoader accessToken={accessToken} />
    </div>
  );
}
