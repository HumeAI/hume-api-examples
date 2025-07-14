import "server-only";
import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async (): Promise<string> => {
  return await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });
};
