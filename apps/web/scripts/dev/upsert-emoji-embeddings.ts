import "dotenv-flow/config";
import { toEmojiMatches } from "../../lib/ai/search-emojis";
import { emojiVectorIndex } from "../../lib/upstash/vector";

const EMOJIBASE_DATA_URL =
  "https://cdn.jsdelivr.net/npm/emojibase-data@16.0.3/en/data.json";
const UPSERT_BATCH_SIZE = 500;

type EmojiVectorRecord = {
  id: string;
  data: string;
  metadata: {
    emoji: string;
    label: string;
  };
};

async function loadEmojiRecords(): Promise<EmojiVectorRecord[]> {
  const response = await fetch(EMOJIBASE_DATA_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error("Failed to load emoji data");
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Failed to load emoji data");
  }

  const records: EmojiVectorRecord[] = [];
  const seen = new Set<string>();

  for (const item of data) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const emoji = typeof record.emoji === "string" ? record.emoji : null;
    const label = typeof record.label === "string" ? record.label.trim() : null;
    const hexcode = typeof record.hexcode === "string" ? record.hexcode : null;

    if (!emoji || !label || !hexcode || seen.has(hexcode)) continue;

    const tags = Array.isArray(record.tags)
      ? record.tags.filter(
          (tag): tag is string =>
            typeof tag === "string" &&
            tag.length > 1 &&
            tag.toLowerCase() !== label.toLowerCase(),
        )
      : [];

    seen.add(hexcode);
    records.push({
      id: hexcode,
      data: tags.length === 0 ? label : `${label} (${tags.join(", ")})`,
      metadata: { emoji, label },
    });
  }

  return records;
}

async function main() {
  if (
    !process.env.UPSTASH_VECTOR_EMOJI_REST_URL ||
    !process.env.UPSTASH_VECTOR_EMOJI_REST_TOKEN
  ) {
    throw new Error(
      "Set UPSTASH_VECTOR_EMOJI_REST_URL and UPSTASH_VECTOR_EMOJI_REST_TOKEN",
    );
  }

  const records = await loadEmojiRecords();

  for (let index = 0; index < records.length; index += UPSERT_BATCH_SIZE) {
    const batch = records.slice(index, index + UPSERT_BATCH_SIZE);
    await emojiVectorIndex.upsert(batch);
    console.log(
      `Upserted ${Math.min(index + batch.length, records.length)}/${records.length}`,
    );
  }

  const query = "jurassic park";
  const hits = await emojiVectorIndex.query({
    data: query,
    topK: 18,
    includeMetadata: true,
  });

  console.log(`\n${query}`);
  for (const match of toEmojiMatches(hits)) {
    console.log(`${match.emoji}  ${match.label}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
