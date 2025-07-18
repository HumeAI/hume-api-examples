import dynamic from "next/dynamic";
import { fetchAccessToken } from "hume";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

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
      <Chat accessToken={accessToken} />
    </div>
  );
}
