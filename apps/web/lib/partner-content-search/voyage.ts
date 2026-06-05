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
}: {
  input: string[];
  inputType: VoyageInputType;
  apiKey?: string;
  fetchImpl?: VoyageFetch;
}) {
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set.");
  if (input.length === 0) return [];

  const response = await fetchImpl(`${VOYAGE_API_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildVoyageEmbeddingRequest({ input, inputType })),
  });

  if (!response.ok) {
    throw new Error(`Voyage embeddings request failed: ${response.status}`);
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
}: {
  query: string;
  documents: string[];
  topK?: number;
  apiKey?: string;
  fetchImpl?: VoyageFetch;
}): Promise<VoyageRerankResult[]> {
  // AI SDK Core supports embeddings, but not Voyage reranking. Keep this direct
  // wrapper until Dub has a shared reranker abstraction.
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set.");
  if (documents.length === 0) return [];

  const response = await fetchImpl(`${VOYAGE_API_BASE_URL}/rerank`, {
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
  });

  if (!response.ok) {
    throw new Error(`Voyage rerank request failed: ${response.status}`);
  }

  const result = (await response.json()) as VoyageRerankResponse;

  return result.data.map(({ relevance_score, ...rest }) => ({
    index: rest.index,
    document: rest.document,
    relevanceScore: relevance_score,
  }));
}
