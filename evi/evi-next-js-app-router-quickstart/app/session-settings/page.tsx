import { fetchAccessToken } from "hume";
import ChatLoader from "@/components/ChatLoader";
import { E2E_SESSION_SETTINGS } from "@/utils/session-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SessionSettingsPage() {
  if (!process.env.HUME_API_KEY || !process.env.HUME_SECRET_KEY) {
    throw new Error(
      "HUME_API_KEY and HUME_SECRET_KEY environment variables must be set."
    );
  }
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  return (
    <div className={"grow flex flex-col"}>
      <ChatLoader
        accessToken={accessToken}
        sessionSettings={E2E_SESSION_SETTINGS}
      />
    </div>
  );
}
