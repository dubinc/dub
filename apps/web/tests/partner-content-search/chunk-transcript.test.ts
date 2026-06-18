import {
  chunkTranscriptSegments,
  estimateTokenCount,
  hashTranscript,
  normalizeTranscriptText,
} from "@/lib/partner-content-search/chunk-transcript";
import { describe, expect, test } from "vitest";

describe("partner content transcript chunking", () => {
  test("normalizes transcript whitespace", () => {
    expect(normalizeTranscriptText("  hello\n\n world\tagain  ")).toBe(
      "hello world again",
    );
  });

  test("creates timestamp-aware chunks with overlap", () => {
    const segments = Array.from({ length: 8 }, (_, index) => ({
      text: `Sentence ${index + 1} talks about AI partner marketing.`,
      startMs: index * 1_000,
      endMs: (index + 1) * 1_000,
    }));

    const chunks = chunkTranscriptSegments(segments, {
      minTokens: 12,
      maxTokens: 18,
      overlapTokens: 8,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].startMs).toBe(0);
    expect(chunks[0].endMs).toBeGreaterThan(0);
    expect(chunks[0].sentenceTimestamps[0]).toMatchObject({
      text: "Sentence 1 talks about AI partner marketing.",
      startMs: 0,
      endMs: 1000,
      segmentIndex: 0,
    });

    expect(chunks[0].text).toContain("Sentence 2");
    expect(chunks[1].text).toContain("Sentence 2");
  });

  test("splits long segment text into sentence timestamp maps", () => {
    const chunks = chunkTranscriptSegments(
      [
        {
          text: "First sentence. Second sentence! Third sentence?",
          startMs: 0,
          endMs: 3_000,
        },
      ],
      {
        minTokens: 20,
        maxTokens: 50,
        overlapTokens: 0,
      },
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].sentenceTimestamps).toEqual([
      {
        text: "First sentence.",
        startMs: 0,
        endMs: 1000,
        segmentIndex: 0,
      },
      {
        text: "Second sentence!",
        startMs: 1000,
        endMs: 2000,
        segmentIndex: 0,
      },
      {
        text: "Third sentence?",
        startMs: 2000,
        endMs: 3000,
        segmentIndex: 0,
      },
    ]);
  });

  test("hashes normalized transcript content deterministically", () => {
    const hashA = hashTranscript([
      { text: "Hello   world", startMs: 0, endMs: 1000 },
    ]);
    const hashB = hashTranscript([
      { text: "Hello world", startMs: 0, endMs: 1000 },
    ]);
    const hashC = hashTranscript([
      { text: "Hello world again", startMs: 0, endMs: 1000 },
    ]);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  test("uses a stable token estimate", () => {
    expect(estimateTokenCount("one two three four")).toBe(6);
    expect(estimateTokenCount("")).toBe(0);
  });
});
