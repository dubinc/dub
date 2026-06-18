import {
  buildVoyageEmbeddingRequest,
  buildVoyageRerankRequest,
  getVoyageEmbeddingMetadata,
} from "@/lib/partner-content-search/voyage";
import { describe, expect, test, vi } from "vitest";

// Mock server-only module (voyage.ts imports it)
vi.mock("server-only", () => ({}));

describe("partner content Voyage helpers", () => {
  test("builds document embedding requests with model metadata", () => {
    expect(
      buildVoyageEmbeddingRequest({
        input: ["AI sales assistant transcript chunk"],
        inputType: "document",
      }),
    ).toEqual({
      input: ["AI sales assistant transcript chunk"],
      model: "voyage-4",
      input_type: "document",
      output_dimension: 1024,
      output_dtype: "float",
      truncation: true,
    });
  });

  test("builds query embedding metadata", () => {
    expect(getVoyageEmbeddingMetadata("query")).toEqual({
      provider: "voyage",
      model: "voyage-4",
      dimensions: 1024,
      inputType: "query",
    });
  });

  test("builds rerank requests with default candidate limits", () => {
    expect(
      buildVoyageRerankRequest({
        query: "fitness influencers",
        documents: ["video about workouts", "video about AI agents"],
      }),
    ).toEqual({
      query: "fitness influencers",
      documents: ["video about workouts", "video about AI agents"],
      model: "rerank-2.5",
      top_k: 150,
      return_documents: false,
      truncation: true,
    });
  });
});
