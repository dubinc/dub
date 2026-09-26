import {
  chunkEmojiCatalog,
  rankEmojiMatches,
  type EmojiCatalogEntry,
} from "@/lib/ai/search-emojis";
import { describe, expect, it } from "vitest";

function entry(
  id: string,
  emoji: string,
  label = "grinning face",
): EmojiCatalogEntry {
  return { id, emoji, label };
}

describe("rankEmojiMatches", () => {
  const catalog = [
    entry("1", "😀", "grinning face"),
    entry("2", "🍕", "pizza"),
    entry("3", "🤒", "face with thermometer"),
  ];

  it("keeps thematic matches above 0.25, highest probability first", () => {
    expect(
      rankEmojiMatches(catalog, {
        "1": 0.3,
        "2": 0.25,
        "3": 0.91,
      }),
    ).toEqual([
      { emoji: "🤒", label: "face with thermometer" },
      { emoji: "😀", label: "grinning face" },
    ]);
  });

  it("returns at most 18 matches", () => {
    const many = Array.from({ length: 50 }, (_, index) =>
      entry(String(index), String.fromCodePoint(0x1f600 + (index % 20))),
    );

    const probabilities = Object.fromEntries(
      many.map((item, index) => [item.id, 0.7 + index / 1000]),
    );

    expect(rankEmojiMatches(many, probabilities)).toHaveLength(18);
  });
});

describe("chunkEmojiCatalog", () => {
  it("keeps a small catalog in one request", () => {
    expect(
      chunkEmojiCatalog([entry("1F600", "😀"), entry("1F355", "🍕", "pizza")]),
    ).toHaveLength(1);
  });

  it("splits a catalog that would exceed Jev's context window", () => {
    const label = "a".repeat(60_000);

    expect(
      chunkEmojiCatalog([entry("1", "😀", label), entry("2", "🍕", label)]),
    ).toHaveLength(2);
  });
});
