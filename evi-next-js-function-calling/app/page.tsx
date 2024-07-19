// ./app/page.tsx
import ClientComponent from '@/components/ClientComponent';
import { getHumeAccessToken } from '@/utils/getHumeAccessToken';

export default async function Page() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error();
  }

  return <ClientComponent accessToken={accessToken} />;
}
