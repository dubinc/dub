import { PlainClient } from "@team-plain/typescript-sdk";

export const plain = new PlainClient({
  apiKey: process.env.PLAIN_API_KEY as string,
});
