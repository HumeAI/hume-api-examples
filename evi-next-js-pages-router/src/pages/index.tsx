// ./pages/index.tsx

import Controls from "@/components/Controls";
import Messages from "@/components/Messages";
import { fetchAccessToken } from "@humeai/voice";
import { VoiceProvider } from "@humeai/voice-react";
import { InferGetServerSidePropsType } from "next";

export const getServerSideProps = async () => {
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    clientSecret: String(process.env.HUME_CLIENT_SECRET),
  });

  if (!accessToken) {
    return {
      redirect: {
        destination: "/error",
        permanent: false,
      },
    };
  }

  return {
    props: {
      accessToken,
    },
  };
};

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Page({ accessToken }: PageProps) {
  return (
    <VoiceProvider auth={{ type: "accessToken", value: accessToken }}>
      <Messages />
      <Controls />
    </VoiceProvider>
  );
}
