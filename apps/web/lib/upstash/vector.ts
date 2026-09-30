import { Index } from "@upstash/vector";

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

type EmojiVectorMetadata = {
  emoji: string;
  label: string;
};

let emojiVectorIndex: Index<EmojiVectorMetadata> | null = null;

export function getEmojiVectorIndex() {
  if (emojiVectorIndex) return emojiVectorIndex;

  const url = process.env.UPSTASH_VECTOR_EMOJI_REST_URL;
  const token = process.env.UPSTASH_VECTOR_EMOJI_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Set UPSTASH_VECTOR_EMOJI_REST_URL and UPSTASH_VECTOR_EMOJI_REST_TOKEN",
    );
  }

  emojiVectorIndex = new Index<EmojiVectorMetadata>({ url, token });
  return emojiVectorIndex;
}
