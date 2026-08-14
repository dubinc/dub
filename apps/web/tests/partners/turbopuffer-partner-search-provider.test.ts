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

function branchesOf(call: number = 0) {
  const [{ queries }] = mocks.multiQuery.mock.calls[call];
  return {
    all: queries,
    // Located by attribute rather than position, so adding a branch does not
    // break every assertion.
    rankedOn: (attribute: string) =>
      queries.filter((branch: any) => branch.rank_by[0] === attribute),
    filteredOn: (attribute: string) =>
      queries.filter((branch: any) =>
        JSON.stringify(branch.filters).includes(
          `["${attribute}","ContainsAllTokens"`,
        ),
      ),
  };
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

  it("indexes identity fields separately, and only those fields", async () => {
    await createProvider().upsert([document]);

    const [{ upsert_rows, schema }] = mocks.write.mock.calls[0];
    const [row] = upsert_rows;

    expect(row.identityText).toBe(
      "pn_test rafi hasan partner@example.com hasan labs",
    );
    // Description, platforms, and links stay out, so a name cannot be
    // out-weighted by how much else a partner has.
    for (const value of ["affiliate marketer", "youtube", "@rafi", "dub.sh"]) {
      expect(row.identityText).not.toContain(value);
    }
    // ContainsAllTokens reads the BM25 index, so no text attribute needs a
    // filter index — and turbopuffer bills FTS + filterable at 200%.
    expect(schema.identityText.filterable).toBeUndefined();
    expect(schema.emailNgrams.filterable).toBeUndefined();
    expect(schema.programId).toMatchObject({ filterable: true });
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
      "https://dub.sh/rafi",
      "https://example.com/referrals/rafi",
    ]) {
      expect(row.searchText).toContain(value);
    }
  });

  it("pins a tokenizer that splits URLs into their components", async () => {
    // The default tokenizer keeps a URL as one token, so "scottdigital" cannot
    // match "https://www.scottdigital-42.techcorp.io" — and websites, short
    // links, and destination URLs are all searchable here.
    await createProvider().upsert([document]);

    const [{ schema }] = mocks.write.mock.calls[0];
    expect(schema.searchText.full_text_search).toMatchObject({
      tokenizer: "word_v2",
    });
    expect(schema.emailNgrams.full_text_search).toEqual({
      tokenizer: "word_v2",
    });
  });

  it("always searches identity separately, so single-word queries can rank", async () => {
    // A single-token last_as_prefix query scores every match at exactly 1, so
    // the broad branch returns them unordered. Matching an identity field puts a
    // document in two branches, which is what the rank fusion orders on.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "rafi",
      limit: 10,
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    expect(queries.map((branch: any) => branch.rank_by[0])).toEqual(
      expect.arrayContaining(["searchText", "identityText"]),
    );
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

  it("adds an all-terms branch for a multi-word query", async () => {
    // BM25 alone does not require every word, and length normalization can rank
    // a long document matching both words below a short one matching only the
    // first. This branch admits only documents containing every term.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "steven tey",
      limit: 10,
    });

    const [allTermsBranch] = branchesOf().filteredOn("identityText");
    expect(allTermsBranch.rank_by).toEqual([
      "identityText",
      "BM25",
      "steven tey",
      { last_as_prefix: true },
    ]);
    expect(allTermsBranch.filters).toEqual([
      "And",
      [
        ["programId", "Eq", "prog_test"],
        [
          "identityText",
          "ContainsAllTokens",
          "steven tey",
          { last_as_prefix: true },
        ],
      ],
    ]);
  });

  it("keeps the last token a prefix while it is still being typed", async () => {
    // An exact-token filter would match nothing for a half-typed final word, so
    // the all-terms boost would vanish exactly while the user is typing.
    // Measured on the production index: "steven te" puts Steven Tey at rank 2
    // with the prefix and rank 4 without it.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "steven te",
      limit: 10,
    });

    const [allTermsBranch] = branchesOf().filteredOn("identityText");

    expect(allTermsBranch.filters[1][1]).toEqual([
      "identityText",
      "ContainsAllTokens",
      "steven te",
      { last_as_prefix: true },
    ]);
  });

  it("skips the all-terms branch for a single-word query", async () => {
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "steven",
      limit: 10,
    });

    expect(branchesOf().filteredOn("identityText")).toHaveLength(0);
  });

  it("requires every trigram on the n-gram branch", async () => {
    // BM25 alone would score a document sharing a single trigram, which is how
    // an unrelated address looks like a partial-email match.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
    });

    const [ngramBranch] = branchesOf().rankedOn("emailNgrams");
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

    expect(branchesOf().rankedOn("emailNgrams")).toHaveLength(0);
  });

  it("fuses branches by rank, boosting documents found by both", async () => {
    // Raw $dist values are incomparable across branches, so they must not
    // decide the order: pge_2 carries the highest raw score but only one
    // branch found it, while both branches found pge_1.
    mocks.multiQuery.mockResolvedValue({
      results: [
        { rows: [{ id: "pge_1", $dist: 0.4 }] },
        {
          rows: [
            { id: "pge_2", $dist: 7.6 },
            { id: "pge_1", $dist: 0.9 },
          ],
        },
      ],
    });

    const { hits } = await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
    });

    expect(hits.map(({ id }) => id)).toEqual(["pge_1", "pge_2"]);
    // RRF: rank 1 + rank 2 across branches vs rank 1 in one branch.
    expect(hits[0].score).toBeCloseTo(1 / 61 + 1 / 62, 10);
    expect(hits[1].score).toBeCloseTo(1 / 61, 10);
  });

  it("breaks cross-branch rank ties deterministically by ID", async () => {
    mocks.multiQuery.mockResolvedValue({
      results: [
        { rows: [{ id: "pge_b", $dist: 9.5 }] },
        { rows: [{ id: "pge_a", $dist: 0.2 }] },
      ],
    });

    const { hits } = await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
    });

    expect(hits.map(({ id }) => id)).toEqual(["pge_a", "pge_b"]);
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

    expect(namespaceName).toBe("partner-search-v2");
  });
});
