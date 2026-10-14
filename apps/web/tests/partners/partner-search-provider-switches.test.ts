import {
  getPartnerSearchProvider,
  getPartnerSearchReadProvider,
  isPartnerSearchReadEnabled,
} from "@/lib/api/partners/search";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/partners/search/providers/turbopuffer", () => ({
  createTurbopufferPartnerSearchProvider: () => ({
    searchCandidates: vi.fn(),
    countCandidates: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  }),
}));

const originalEnv = { ...process.env };

describe("partner search switches", () => {
  beforeEach(() => {
    delete process.env.TURBOPUFFER_API_KEY;
    delete process.env.PARTNER_SEARCH_READ_ENABLED;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("writes nowhere until the key is configured", () => {
    expect(getPartnerSearchProvider()).toBeNull();
  });

  // The rollout depends on this. Syncs have to run for the whole backfill
  // before the index is complete enough to read, so the key alone must not
  // turn reads on.
  it("keeps reads on the database when only the key is configured", () => {
    process.env.TURBOPUFFER_API_KEY = "tpuf_test";

    expect(getPartnerSearchProvider()).not.toBeNull();
    expect(isPartnerSearchReadEnabled()).toBe(false);
    expect(getPartnerSearchReadProvider()).toBeNull();
  });

  it("reads from the index once both switches are on", () => {
    process.env.TURBOPUFFER_API_KEY = "tpuf_test";
    process.env.PARTNER_SEARCH_READ_ENABLED = "true";

    expect(getPartnerSearchReadProvider()).not.toBeNull();
  });

  // The point of the split: clearing the read flag stops search without
  // stopping indexing, so deletions keep being applied while rolled back and
  // coming back needs no rebuild.
  it("keeps writing while reads are switched off", () => {
    process.env.TURBOPUFFER_API_KEY = "tpuf_test";
    process.env.PARTNER_SEARCH_READ_ENABLED = "false";

    expect(getPartnerSearchReadProvider()).toBeNull();
    expect(getPartnerSearchProvider()).not.toBeNull();
  });

  // Otherwise the read flag alone would look enabled with no index behind it,
  // which is the one combination that returns empty results rather than
  // falling back.
  it("cannot read without a key, however the read flag is set", () => {
    process.env.PARTNER_SEARCH_READ_ENABLED = "true";

    expect(getPartnerSearchReadProvider()).toBeNull();
  });

  it('treats anything other than "true" as off', () => {
    process.env.TURBOPUFFER_API_KEY = "tpuf_test";

    for (const value of ["", "false", "1", "yes", "TRUE"]) {
      process.env.PARTNER_SEARCH_READ_ENABLED = value;
      expect(getPartnerSearchReadProvider()).toBeNull();
    }
  });
});
