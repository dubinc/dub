import { createHash } from "crypto";
import { PARTNER_CONTENT_SEARCH_LIMITS } from "./constants";
import {
  ChunkTranscriptOptions,
  SentenceTimestamp,
  TranscriptChunk,
  TranscriptSegment,
} from "./types";

type SentenceUnit = SentenceTimestamp & {
  tokenEstimate: number;
};

export function normalizeTranscriptText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeTranscriptSegments(segments: TranscriptSegment[]) {
  return segments
    .map((segment) => ({
      text: normalizeTranscriptText(segment.text),
      startMs: segment.startMs ?? null,
      endMs: segment.endMs ?? null,
    }))
    .filter((segment) => segment.text.length > 0);
}

export function hashTranscript(segments: TranscriptSegment[]) {
  const normalized = normalizeTranscriptSegments(segments)
    .map(
      ({ text, startMs, endMs }) =>
        `${startMs ?? ""}:${endMs ?? ""}:${text}`,
    )
    .join("\n");

  return hashText(normalized);
}

export function hashText(text: string) {
  return createHash("sha256")
    .update(normalizeTranscriptText(text))
    .digest("hex");
}

export function estimateTokenCount(text: string) {
  const normalized = normalizeTranscriptText(text);
  if (!normalized) return 0;

  // Lightweight approximation keeps this dependency-free; swap in a tokenizer later if needed.
  const words = normalized.split(/\s+/).length;
  return Math.max(1, Math.ceil(words * 1.35));
}

export function chunkTranscriptSegments(
  segments: TranscriptSegment[],
  options: ChunkTranscriptOptions = {},
): TranscriptChunk[] {
  const maxTokens =
    options.maxTokens ?? PARTNER_CONTENT_SEARCH_LIMITS.chunkMaxTokens;
  const minTokens =
    options.minTokens ?? PARTNER_CONTENT_SEARCH_LIMITS.chunkMinTokens;
  const overlapTokens =
    options.overlapTokens ?? PARTNER_CONTENT_SEARCH_LIMITS.chunkOverlapTokens;

  if (maxTokens <= 0) throw new Error("maxTokens must be greater than 0.");
  if (minTokens <= 0) throw new Error("minTokens must be greater than 0.");
  if (overlapTokens < 0) throw new Error("overlapTokens cannot be negative.");
  if (overlapTokens >= maxTokens) {
    throw new Error("overlapTokens must be less than maxTokens.");
  }

  const units = normalizeTranscriptSegments(segments).flatMap(
    (segment, segmentIndex) =>
      splitSegmentIntoSentenceUnits(segment, segmentIndex),
  );

  if (units.length === 0) return [];

  const chunks: TranscriptChunk[] = [];
  let startIndex = 0;

  while (startIndex < units.length) {
    let endIndex = startIndex;
    let tokenEstimate = 0;

    while (endIndex < units.length) {
      const nextTokens = units[endIndex].tokenEstimate;
      const wouldExceedMax =
        tokenEstimate > 0 && tokenEstimate + nextTokens > maxTokens;
      const meetsMinimum = tokenEstimate >= minTokens;

      if (wouldExceedMax && meetsMinimum) break;

      tokenEstimate += nextTokens;
      endIndex++;

      if (tokenEstimate >= maxTokens) break;
    }

    if (endIndex === startIndex) endIndex++;

    const chunkUnits = units.slice(startIndex, endIndex);
    chunks.push(toTranscriptChunk(chunks.length, chunkUnits));

    if (endIndex >= units.length) break;

    startIndex = getNextStartIndex({
      units,
      startIndex,
      endIndex,
      overlapTokens,
    });
  }

  return chunks;
}

function splitSegmentIntoSentenceUnits(
  segment: Required<TranscriptSegment>,
  segmentIndex: number,
): SentenceUnit[] {
  const sentences = splitIntoSentences(segment.text);

  if (sentences.length === 0) return [];

  const hasTiming = segment.startMs !== null && segment.endMs !== null;
  const duration = hasTiming
    ? Math.max(0, Number(segment.endMs) - Number(segment.startMs))
    : 0;

  return sentences.map((sentence, index) => {
    const startMs =
      hasTiming && duration > 0
        ? Math.round(
            Number(segment.startMs) + (duration * index) / sentences.length,
          )
        : segment.startMs;
    const endMs =
      hasTiming && duration > 0
        ? Math.round(
            Number(segment.startMs) +
              (duration * (index + 1)) / sentences.length,
          )
        : segment.endMs;

    return {
      text: sentence,
      startMs,
      endMs,
      segmentIndex,
      tokenEstimate: estimateTokenCount(sentence),
    };
  });
}

function splitIntoSentences(text: string) {
  const normalized = normalizeTranscriptText(text);
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [
    normalized,
  ];

  return sentences.map(normalizeTranscriptText).filter(Boolean);
}

function toTranscriptChunk(
  chunkIndex: number,
  sentenceUnits: SentenceUnit[],
): TranscriptChunk {
  const sentenceTimestamps = sentenceUnits.map(
    ({ tokenEstimate: _tokenEstimate, ...unit }) => unit,
  );

  return {
    chunkIndex,
    text: sentenceUnits.map(({ text }) => text).join(" "),
    tokenEstimate: sentenceUnits.reduce(
      (total, unit) => total + unit.tokenEstimate,
      0,
    ),
    startMs: firstNonNull(sentenceUnits.map(({ startMs }) => startMs)),
    endMs: lastNonNull(sentenceUnits.map(({ endMs }) => endMs)),
    sentenceTimestamps,
  };
}

function getNextStartIndex({
  units,
  startIndex,
  endIndex,
  overlapTokens,
}: {
  units: SentenceUnit[];
  startIndex: number;
  endIndex: number;
  overlapTokens: number;
}) {
  if (overlapTokens === 0) return endIndex;

  let overlap = 0;
  let nextStartIndex = endIndex;

  while (nextStartIndex > startIndex + 1 && overlap < overlapTokens) {
    nextStartIndex--;
    overlap += units[nextStartIndex].tokenEstimate;
  }

  return Math.max(startIndex + 1, Math.min(nextStartIndex, endIndex));
}

function firstNonNull(values: Array<number | null>) {
  return values.find((value): value is number => value !== null) ?? null;
}

function lastNonNull(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index--) {
    if (values[index] !== null) return values[index];
  }
  return null;
}
