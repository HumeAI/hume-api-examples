import { HumeClient } from "hume";

export const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});
