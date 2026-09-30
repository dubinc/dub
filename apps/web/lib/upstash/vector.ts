import { Index } from "@upstash/vector";

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL ?? "",
  token: process.env.UPSTASH_VECTOR_REST_TOKEN ?? "",
});

export const emojiVectorIndex = new Index<{
  emoji: string;
  label: string;
}>({
  url: process.env.UPSTASH_VECTOR_EMOJI_REST_URL ?? "",
  token: process.env.UPSTASH_VECTOR_EMOJI_REST_TOKEN ?? "",
});
