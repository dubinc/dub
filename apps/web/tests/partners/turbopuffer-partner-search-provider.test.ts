import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  type PartnerSearchDocument,
} from "@/lib/api/partners/search";
import {
  createTurbopufferPartnerSearchProvider,
  deleteTurbopufferPartnerSearchNamespace,
  type TurbopufferNamespace,
} from "@/lib/api/partners/search/providers/turbopuffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const document: PartnerSearchDocument = {
  id: "pge_test",
  programId: "prog_test",
  partnerId: "pn_test",
  name: "Rafi Hasan",
  email: "partner@example.com",
  companyName: "Hasan Labs",
  description: "Affiliate marketer",
  platformTypes: ["youtube"],
  platformIdentifiers: ["@rafi"],
  linkDomains: ["dub.sh"],
  linkKeys: ["rafi"],
  shortLinks: ["https://dub.sh/rafi"],
  destinationUrls: ["https://example.com/referrals/rafi"],
};

const mocks = vi.hoisted(() => ({
  write: vi.fn(),
  multiQuery: vi.fn(),
  deleteAll: vi.fn(),
}));

function createNamespaceMock(): TurbopufferNamespace {
  return {
    write: mocks.write,
    multiQuery: mocks.multiQuery,
    deleteAll: mocks.deleteAll,
  } as unknown as TurbopufferNamespace;
}

function createProvider() {
  return createTurbopufferPartnerSearchProvider({
    namespace: createNamespaceMock(),
    namespaceName: "test-namespace",
  });
}

describe("Turbopuffer partner search provider", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.write.mockResolvedValue({ rows_affected: 1 });
    mocks.multiQuery.mockResolvedValue({ results: [] });
  });

  // In afterEach rather than the test body, so a failed assertion cannot leak
  // a stubbed env var into later tests.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flattens every searchable field into one BM25 attribute", async () => {
    await createProvider().upsert([document]);

    const [{ upsert_rows, schema }] = mocks.write.mock.calls[0];
    expect(upsert_rows).toHaveLength(1);

    const [row] = upsert_rows;
    expect(row.id).toBe("pge_test");
    expect(row.programId).toBe("prog_test");
    for (const value of [
      "rafi hasan",
      "partner@example.com",
      "hasan labs",
      "affiliate marketer",
      "youtube",
      "@rafi",
      "dub.sh",
      "https://dub.sh/rafi",
      "https://example.com/referrals/rafi",
    ]) {
      expect(row.searchText).toContain(value);
    }

    // BM25 attributes are not filterable by default, but the n-gram branch
    // filters on emailNgrams.
    expect(schema.emailNgrams).toMatchObject({ filterable: true });
    expect(schema.programId).toMatchObject({ filterable: true });
  });

  it("pins a tokenizer that splits URLs into their components", async () => {
    // The default tokenizer keeps a URL as one token, so "scottdigital" cannot
    // match "https://www.scottdigital-42.techcorp.io" — and websites, short
    // links, and destination URLs are all searchable here.
    await createProvider().upsert([document]);

    const [{ schema }] = mocks.write.mock.calls[0];
    expect(schema.searchText.full_text_search).toEqual({
      tokenizer: "word_v2",
    });
    expect(schema.emailNgrams.full_text_search).toEqual({
      tokenizer: "word_v2",
    });
  });

  it("scopes both branches to the program and matches prefixes", async () => {
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "rafi",
      limit: 10,
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    const [textBranch] = queries;

    expect(textBranch.rank_by).toEqual([
      "searchText",
      "BM25",
      "rafi",
      { last_as_prefix: true },
    ]);
    expect(textBranch.filters).toEqual(["programId", "Eq", "prog_test"]);

    for (const branch of queries) {
      expect(JSON.stringify(branch.filters)).toContain("prog_test");
      expect(branch.top_k).toBe(10);
    }
  });

  it("requires every trigram on the n-gram branch", async () => {
    // BM25 alone would score a document sharing a single trigram, which is how
    // an unrelated address looks like a partial-email match.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    expect(queries).toHaveLength(2);

    const [, ngramBranch] = queries;
    expect(ngramBranch.rank_by).toEqual(["emailNgrams", "BM25", "exa xam amp"]);
    expect(ngramBranch.filters).toEqual([
      "And",
      [
        ["programId", "Eq", "prog_test"],
        ["emailNgrams", "ContainsAllTokens", "exa xam amp"],
      ],
    ]);
  });

  it("skips the n-gram branch when the query cannot produce trigrams", async () => {
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "hi",
      limit: 10,
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    expect(queries).toHaveLength(1);
  });

  it("unions branches, keeping the better score for a shared document", async () => {
    mocks.multiQuery.mockResolvedValue({
      results: [
        { rows: [{ id: "pge_1", $dist: 0.4 }] },
        {
          rows: [
            { id: "pge_1", $dist: 0.9 },
            { id: "pge_2", $dist: 0.6 },
          ],
        },
      ],
    });

    const { hits } = await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
    });

    expect(hits).toEqual([
      { id: "pge_1", score: 0.9 },
      { id: "pge_2", score: 0.6 },
    ]);
  });

  it("never returns more than the requested limit", async () => {
    mocks.multiQuery.mockResolvedValue({
      results: [
        { rows: [{ id: "pge_1", $dist: 0.5 }] },
        { rows: [{ id: "pge_2", $dist: 0.4 }] },
      ],
    });

    const { hits } = await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 1,
    });

    expect(hits).toHaveLength(1);
  });

  it("rejects a limit above the candidate ceiling", async () => {
    await expect(
      createProvider().searchCandidates({
        programId: "prog_test",
        query: "rafi",
        limit: PARTNER_SEARCH_CANDIDATE_LIMIT + 1,
      }),
    ).rejects.toThrow("Partner search candidate limit");
  });

  it("deletes by document ID", async () => {
    await createProvider().delete(["pge_1", "pge_2"]);

    expect(mocks.write).toHaveBeenCalledWith({
      deletes: ["pge_1", "pge_2"],
    });
  });

  it("does not wait for indexing, which turbopuffer does not need", async () => {
    await expect(createProvider().waitForIndexing()).resolves.toBeUndefined();
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("empties the namespace", async () => {
    mocks.deleteAll.mockResolvedValue({});

    const result = await deleteTurbopufferPartnerSearchNamespace({
      namespace: createNamespaceMock(),
      namespaceName: "test-namespace",
    });

    expect(mocks.deleteAll).toHaveBeenCalledOnce();
    expect(result).toEqual({ namespaceName: "test-namespace" });
  });

  it("falls back to the default namespace when the env var is blank", async () => {
    vi.stubEnv("PARTNER_SEARCH_INDEX_NAME", "");
    mocks.deleteAll.mockResolvedValue({});

    const { namespaceName } = await deleteTurbopufferPartnerSearchNamespace({
      namespace: createNamespaceMock(),
    });

    expect(namespaceName).toBe("partner-search-v1");
  });
});
