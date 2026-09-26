import { experimental_evaluate as evaluate } from "ai";

const EMOJIBASE_DATA_URL =
  "https://cdn.jsdelivr.net/npm/emojibase-data@16.0.3/en/data.json";

const MATCH_LIMIT = 18;
const MATCH_THRESHOLD = 0.25;
const MAX_QUESTIONS_JSON_CHARS = 100_000;
const MAX_TAGS = 12;
const SEARCH_CACHE_LIMIT = 100;

const MATCH_INSTRUCTIONS =
  "Is this a good emoji for the search, including the same subject, synonyms, and close themes such as movies, characters, places, and objects?";

export type EmojiMatch = {
  emoji: string;
  label: string;
};

export type EmojiCatalogEntry = EmojiMatch & {
  id: string;
  tags?: string[];
};

let catalogPromise: Promise<EmojiCatalogEntry[]> | null = null;
const searchCache = new Map<string, EmojiMatch[]>();
const searchRequests = new Map<string, Promise<EmojiMatch[]>>();

export function rankEmojiMatches(
  catalog: EmojiCatalogEntry[],
  probabilities: Record<string, number>,
): EmojiMatch[] {
  return catalog
    .flatMap((entry) => {
      const probability = probabilities[entry.id];

      if (probability === undefined || probability <= MATCH_THRESHOLD) {
        return [];
      }

      return [{ ...entry, probability }];
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MATCH_LIMIT)
    .map(({ emoji, label }) => ({ emoji, label }));
}

function emojiQuestion(entry: EmojiCatalogEntry) {
  const tags = (entry.tags ?? [])
    .filter(
      (tag) =>
        tag.length > 1 && tag.toLowerCase() !== entry.label.toLowerCase(),
    )
    .slice(0, MAX_TAGS);

  return {
    type: "boolean" as const,
    instructions: MATCH_INSTRUCTIONS,
    criteria: {
      true:
        tags.length === 0 ? entry.label : `${entry.label} (${tags.join(", ")})`,
      false: "unrelated subject",
    },
  };
}

export function chunkEmojiCatalog(
  catalog: EmojiCatalogEntry[],
): EmojiCatalogEntry[][] {
  const chunks: EmojiCatalogEntry[][] = [];
  let current: EmojiCatalogEntry[] = [];
  let size = 2;

  for (const entry of catalog) {
    const question = emojiQuestion(entry);
    const entrySize =
      JSON.stringify(entry.id).length + JSON.stringify(question).length + 1;

    if (current.length > 0 && size + entrySize > MAX_QUESTIONS_JSON_CHARS) {
      chunks.push(current);
      current = [];
      size = 2;
    }

    current.push(entry);
    size += entrySize;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function getEmojiCatalog() {
  catalogPromise ??= fetch(EMOJIBASE_DATA_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to load emoji data");
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Failed to load emoji data");
      }

      const catalog: EmojiCatalogEntry[] = [];
      const seen = new Set<string>();

      for (const item of data) {
        if (!item || typeof item !== "object") continue;

        const record = item as Record<string, unknown>;
        const emoji = typeof record.emoji === "string" ? record.emoji : null;
        const label =
          typeof record.label === "string" ? record.label.trim() : null;
        const hexcode =
          typeof record.hexcode === "string" ? record.hexcode : null;
        const tags = Array.isArray(record.tags)
          ? record.tags.filter((tag): tag is string => typeof tag === "string")
          : [];

        if (!emoji || !label || !hexcode || seen.has(hexcode)) continue;

        seen.add(hexcode);
        catalog.push({ id: hexcode, emoji, label, tags });
      }

      return catalog;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });

  return catalogPromise;
}

export function warmEmojiCatalog() {
  void getEmojiCatalog().catch(() => undefined);
}

export async function searchEmojis(query: string): Promise<EmojiMatch[]> {
  const normalized = query.trim().toLowerCase();

  if (normalized.length < 2) {
    return [];
  }

  const cached = searchCache.get(normalized);
  if (cached) return cached;

  const pending = searchRequests.get(normalized);
  if (pending) return pending;

  const request = getEmojiCatalog()
    .then(async (catalog) => {
      const probabilitySets = await Promise.all(
        chunkEmojiCatalog(catalog).map(async (entries) => {
          const result = await evaluate({
            model: "typesafe-ai/jev",
            state: normalized,
            questions: Object.fromEntries(
              entries.map((entry) => [entry.id, emojiQuestion(entry)]),
            ),
            providerOptions: {
              gateway: {
                zeroDataRetention: true,
              },
            },
          });

          const probabilities: Record<string, number> = {};

          for (const entry of entries) {
            const answer = result.answers[entry.id];

            if (answer?.type === "boolean") {
              probabilities[entry.id] = answer.probability;
            }
          }

          return probabilities;
        }),
      );
      const matches = rankEmojiMatches(
        catalog,
        Object.assign({}, ...probabilitySets),
      );

      if (searchCache.size >= SEARCH_CACHE_LIMIT) {
        const oldest = searchCache.keys().next().value;
        if (oldest) searchCache.delete(oldest);
      }

      searchCache.set(normalized, matches);
      return matches;
    })
    .finally(() => {
      searchRequests.delete(normalized);
    });

  searchRequests.set(normalized, request);
  return request;
}
