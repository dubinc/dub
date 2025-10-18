import { Tinybird } from "@chronark/zod-bird";

export const tb = new Tinybird({
  token: process.env.TINYBIRD_API_KEY as string,
  baseUrl: process.env.TINYBIRD_API_URL as string,
});

// TODO: Remove after Tinybird migration
export const tbOld = new Tinybird({
  token: process.env.TINYBIRD_API_KEY_OLD as string,
  baseUrl: process.env.TINYBIRD_API_URL as string,
});
