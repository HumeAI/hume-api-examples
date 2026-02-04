import ChatLoader from "@/components/ChatLoader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApiKeyPage() {
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("The HUME_API_KEY environment variable is not set.");
  }

  return (
    <div className={"grow flex flex-col"}>
      <ChatLoader apiKey={apiKey} />
    </div>
  );
}
