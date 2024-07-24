import { Tinybird } from "@chronark/zod-bird";

export const tbDemo = new Tinybird({
  token: process.env.TINYBIRD_DEMO_API_KEY as string,
  baseUrl: process.env.TINYBIRD_API_URL as string,
});
