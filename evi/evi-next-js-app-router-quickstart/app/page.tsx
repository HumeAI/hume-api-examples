import { fetchAccessToken } from "hume";
import ChatLoader from "@/components/ChatLoader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  if (!process.env.HUME_API_KEY) {
    throw new Error("The HUME_API_KEY environment variable is not set.");
  }
  if (!process.env.HUME_SECRET_KEY) {
    throw new Error("The HUME_SECRET_KEY environment variable is not set.");
  }
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
