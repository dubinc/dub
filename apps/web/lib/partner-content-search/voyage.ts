import "server-only";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "./constants";
import {
  VoyageEmbeddingMetadata,
  VoyageInputType,
  VoyageRerankResult,
} from "./types";

const VOYAGE_API_BASE_URL = "https://api.voyageai.com/v1";

type VoyageEmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

type VoyageRerankResponse = {
  data: Array<{
    index: number;
    relevance_score: number;
    document?: string;
  }>;
};

type VoyageFetch = typeof fetch;

// Typed error so callers can branch on HTTP status (e.g. 429), not the message.
export class VoyageApiError extends Error {
  constructor(
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(`Voyage ${endpoint} request failed: ${status}`);
    this.name = "VoyageApiError";
  }
}

// Thrown when a Voyage request exceeds the caller's timeout. Search routes catch
// it to fail fast instead of hanging until Vercel kills the function at maxDuration.
export class VoyageTimeoutError extends Error {
  constructor(
    readonly endpoint: string,
    readonly timeoutMs: number,
  ) {
    super(`Voyage ${endpoint} request timed out after ${timeoutMs}ms`);
    this.name = "VoyageTimeoutError";
  }
}

function isAbortOrTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

// Serialize an embedding for raw SQL TO_VECTOR(...). Used by the embed + search routes.
export function serializeEmbeddingForVector(embedding: number[]) {
  const expectedDimensions = PARTNER_CONTENT_SEARCH_MODELS.embedding.dimensions;

  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Expected ${expectedDimensions} embedding dimensions, received ${embedding.length}.`,
    );
  }

  return JSON.stringify(
    embedding.map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error("Voyage returned a non-finite embedding value.");
      }

      return value;
    }),
  );
}

export function buildVoyageEmbeddingRequest({
  input,
  inputType,
}: {
  input: string[];
  inputType: VoyageInputType;
}) {
  return {
    input,
    model: PARTNER_CONTENT_SEARCH_MODELS.embedding.model,
    input_type: inputType,
    output_dimension: PARTNER_CONTENT_SEARCH_MODELS.embedding.dimensions,
    output_dtype: PARTNER_CONTENT_SEARCH_MODELS.embedding.outputDtype,
    truncation: true,
  };
}

export function buildVoyageRerankRequest({
  query,
  documents,
  topK,
  returnDocuments = false,
}: {
  query: string;
  documents: string[];
  topK?: number;
  returnDocuments?: boolean;
}) {
  return {
    query,
    documents,
    model: PARTNER_CONTENT_SEARCH_MODELS.reranker.model,
    top_k: topK ?? PARTNER_CONTENT_SEARCH_LIMITS.rerankerCandidateCount,
    return_documents: returnDocuments,
    truncation: true,
  };
}

export function getVoyageEmbeddingMetadata(
  inputType: VoyageInputType,
): VoyageEmbeddingMetadata {
  return {
    provider: "voyage",
    model: PARTNER_CONTENT_SEARCH_MODELS.embedding.model,
    dimensions: PARTNER_CONTENT_SEARCH_MODELS.embedding.dimensions,
    inputType,
  };
}

export async function embedPartnerContentTexts({
  input,
  inputType,
  apiKey = process.env.VOYAGE_API_KEY,
  fetchImpl = fetch,
  timeoutMs,
}: {
  input: string[];
  inputType: VoyageInputType;
  apiKey?: string;
  fetchImpl?: VoyageFetch;
  // Opt-in abort timeout; the bulk embed cron omits it so large batches aren't cut off.
  timeoutMs?: number;
}) {
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set.");
  if (input.length === 0) return [];

  let response: Awaited<ReturnType<VoyageFetch>>;
  try {
    response = await fetchImpl(`${VOYAGE_API_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildVoyageEmbeddingRequest({ input, inputType })),
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (error) {
    if (timeoutMs && isAbortOrTimeoutError(error)) {
      throw new VoyageTimeoutError("embeddings", timeoutMs);
    }
    throw error;
  }

  if (!response.ok) {
    throw new VoyageApiError(response.status, "embeddings");
  }

  const result = (await response.json()) as VoyageEmbeddingResponse;

  return result.data
    .sort((a, b) => a.index - b.index)
    .map(({ embedding }) => embedding);
}

export async function rerankPartnerContent({
  query,
  documents,
  topK,
  apiKey = process.env.VOYAGE_API_KEY,
  fetchImpl = fetch,
  timeoutMs,
}: {
  query: string;
  documents: string[];
  topK?: number;
  apiKey?: string;
  fetchImpl?: VoyageFetch;
  // Opt-in abort timeout; search routes pass it so a slow rerank falls back to cosine.
  timeoutMs?: number;
}): Promise<VoyageRerankResult[]> {
  // AI SDK Core doesn't support Voyage reranking; direct wrapper until we share one.
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set.");
  if (documents.length === 0) return [];

  let response: Awaited<ReturnType<VoyageFetch>>;
  try {
    response = await fetchImpl(`${VOYAGE_API_BASE_URL}/rerank`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildVoyageRerankRequest({
          query,
          documents,
          topK,
        }),
      ),
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (error) {
    if (timeoutMs && isAbortOrTimeoutError(error)) {
      throw new VoyageTimeoutError("rerank", timeoutMs);
    }
    throw error;
  }

  if (!response.ok) {
    throw new VoyageApiError(response.status, "rerank");
  }

  const result = (await response.json()) as VoyageRerankResponse;

  return result.data.map(({ relevance_score, ...rest }) => ({
    index: rest.index,
    document: rest.document,
    relevanceScore: relevance_score,
  }));
}
