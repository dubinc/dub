import {
  PARTNER_SEARCH_CANDIDATE_LIMIT,
  type PartnerSearchDocument,
} from "@/lib/api/partners/search";
import {
  createTurbopufferPartnerSearchProvider,
  deleteTurbopufferPartnerSearchNamespace,
  PARTNER_SEARCH_NAMESPACE,
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
  linkKeys: ["rafi-link"],
  status: "approved",
  groupId: "grp_test",
  country: "US",
  partnerTagIds: ["ptag_a", "ptag_b"],
};

const mocks = vi.hoisted(() => ({
  write: vi.fn(),
  multiQuery: vi.fn(),
  query: vi.fn(),
  deleteAll: vi.fn(),
}));

function createNamespaceMock(): TurbopufferNamespace {
  return {
    write: mocks.write,
    multiQuery: mocks.multiQuery,
    query: mocks.query,
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
    mocks.query.mockResolvedValue({ aggregations: { total: 12_000 } });
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
    for (const value of ["affiliate marketer", "youtube", "@rafi", "rafi-link"]) {
      expect(row.identityText).not.toContain(value);
    }
    // ContainsAllTokens reads the BM25 index, so no text attribute needs a
    // filter index, and turbopuffer bills FTS + filterable at 200%.
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
      "rafi-link",
    ]) {
      expect(row.searchText).toContain(value);
    }
  });

  it("pins a tokenizer that splits URLs into their components", async () => {
    // The default tokenizer keeps a URL as one token, so "scottdigital" cannot
    // match "https://www.scottdigital-42.techcorp.io", and websites, short
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

  it("narrows every branch with the discrete filters", async () => {
    // The filters have to sit inside each branch: applying them after the
    // ranking truncates is what made a broad query with country=US return 85
    // rows out of 7,698 real matches.
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
      filters: {
        status: { values: ["approved"] },
        country: { values: ["US", "CA"], exclude: true },
        partnerTagIds: { values: ["ptag_1"] },
      },
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    expect(queries.length).toBeGreaterThan(1);

    for (const branch of queries) {
      const filters = JSON.stringify(branch.filters);
      expect(filters).toContain('["programId","Eq","prog_test"]');
      expect(filters).toContain('["status","In",["approved"]]');
      // Exclusion uses NotIn, which also matches documents that omit country.
      expect(filters).toContain('["country","NotIn",["US","CA"]]');
      expect(filters).toContain('["partnerTagIds","ContainsAny",["ptag_1"]]');
    }
  });

  it("omits absent filters rather than sending empty clauses", async () => {
    await createProvider().searchCandidates({
      programId: "prog_test",
      query: "examp",
      limit: 10,
      filters: { status: undefined, country: { values: [] } },
    });

    const [{ queries }] = mocks.multiQuery.mock.calls[0];
    for (const branch of queries) {
      expect(JSON.stringify(branch.filters)).not.toContain('"country"');
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

  it("counts a three-character prefix, the shortest it will answer", async () => {
    const total = await createProvider().countCandidates({
      programId: "prog_test",
      query: "ale",
      limit: 10,
    });

    expect(total).toBe(12_000);
  });

  it("returns null when the response carries no aggregate", async () => {
    // Zero would render an unanswered count as an exact empty result.
    mocks.query.mockResolvedValue({});

    await expect(
      createProvider().countCandidates({
        programId: "prog_test",
        query: "creator",
        limit: 10,
      }),
    ).resolves.toBeNull();
  });

  it("counts matches without the candidate ceiling", async () => {
    const total = await createProvider().countCandidates({
      programId: "prog_test",
      query: "creator",
      limit: 10,
      filters: { status: { values: ["approved"] } },
    });

    expect(total).toBe(12_000);

    const [request] = mocks.query.mock.calls[0];
    expect(request.aggregate_by).toEqual({ total: ["Count"] });
    // One clause covers both text branches, since identityText holds a subset
    // of what searchText holds.
    const filters = JSON.stringify(request.filters);
    expect(filters).toContain('["searchText","ContainsAnyToken","creator"');
    expect(filters).toContain('["status","In",["approved"]]');
  });

  it.each([
    ["a single character", "a"],
    ["a half-typed final token", "steven a"],
  ])(
    "declines to count %s, which the prefix expands too far",
    async (_label, query) => {
      // Measured against 626K documents: a one-character prefix takes the
      // aggregation from ~50ms to ~1.2s, past the deadline every time.
      const total = await createProvider().countCandidates({
        programId: "prog_test",
        query,
        limit: 10,
      });

      expect(total).toBeNull();
      expect(mocks.query).not.toHaveBeenCalled();
    },
  );

  it("deletes by document ID", async () => {
    await createProvider().delete(["pge_1", "pge_2"]);

    expect(mocks.write).toHaveBeenCalledWith({
      deletes: ["pge_1", "pge_2"],
    });
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

  it("uses the pinned namespace when none is passed", async () => {
    mocks.deleteAll.mockResolvedValue({});

    const { namespaceName } = await deleteTurbopufferPartnerSearchNamespace({
      namespace: createNamespaceMock(),
    });

    expect(namespaceName).toBe(PARTNER_SEARCH_NAMESPACE);
  });
});
