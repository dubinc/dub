import { emojiVectorIndex } from "@/lib/upstash/vector";

const MATCH_LIMIT = 18;
const MATCH_SCORE_FLOOR = 0.45;

export type EmojiMatch = {
  emoji: string;
  label: string;
};

type EmojiVectorHit = {
  score: number;
  metadata?: {
    emoji?: string;
    label?: string;
  } | null;
};

export function toEmojiMatches(hits: EmojiVectorHit[]): EmojiMatch[] {
  const matches: EmojiMatch[] = [];

  for (const hit of hits) {
    if (hit.score < MATCH_SCORE_FLOOR) continue;

    const emoji = hit.metadata?.emoji;
    const label = hit.metadata?.label?.trim();

    if (!emoji || !label) continue;

    matches.push({ emoji, label });

    if (matches.length >= MATCH_LIMIT) break;
  }

  return matches;
}

export async function searchEmojis(query: string): Promise<EmojiMatch[]> {
  const normalized = query.trim().toLowerCase();

  if (normalized.length < 2) {
    return [];
  }

  const hits = await emojiVectorIndex.query({
    data: normalized,
    topK: MATCH_LIMIT,
    includeMetadata: true,
  });

  return toEmojiMatches(hits);
}
