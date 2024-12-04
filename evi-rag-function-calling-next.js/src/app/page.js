import ClientComponent from "./components/Main";
import { fetchAccessToken } from "hume";

const HUME_SECRET_KEY = process.env.HUME_SECRET_KEY;
const HUME_API_KEY = process.env.HUME_API_KEY;

export default async function Page() {
	const accessToken = await fetchAccessToken({
		apiKey: HUME_API_KEY,
		secretKey: HUME_SECRET_KEY,
	});

	return <ClientComponent accessToken={accessToken} />;
}
