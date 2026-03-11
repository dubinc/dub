import { filterActiveGroupBounties } from "@/lib/bounty/api/get-group-bounty-summaries";
import { BountyType } from "@dub/prisma/client";
import { describe, expect, it } from "vitest";

const GROUP_ID = "grp_test_123";
const OTHER_GROUP_ID = "grp_other_456";

const NOW = new Date("2025-06-01T12:00:00.000Z");

function makeCandidate(
  overrides: Partial<{
    id: string;
    name: string | null;
    type: BountyType;
    startsAt: Date;
    endsAt: Date | null;
    archivedAt: Date | null;
    groups: { groupId: string }[];
  }> = {},
) {
  return {
    id: "bnty_1",
    name: "Test Bounty",
    type: "submission" as BountyType,
    startsAt: new Date("2025-01-01T00:00:00.000Z"),
    endsAt: null,
    archivedAt: null,
    groups: [],
    ...overrides,
  };
}

describe("filterActiveGroupBounties", () => {
  it("excludes archived bounties", () => {
    const bounty = makeCandidate({ archivedAt: new Date("2025-05-01T00:00:00.000Z") });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(0);
  });

  it("excludes bounties that have not started yet (startsAt > now)", () => {
    const bounty = makeCandidate({ startsAt: new Date("2025-06-02T00:00:00.000Z") });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(0);
  });

  it("includes bounties that start exactly at now (startsAt === now, boundary is exclusive >)", () => {
    const bounty = makeCandidate({ startsAt: NOW });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(1);
  });

  it("excludes bounties whose endsAt is exactly now (endsAt === now, exclusive boundary)", () => {
    const bounty = makeCandidate({ endsAt: NOW });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(0);
  });

  it("excludes bounties that expired before now (endsAt < now)", () => {
    const bounty = makeCandidate({ endsAt: new Date("2025-05-31T00:00:00.000Z") });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(0);
  });

  it("includes bounties with no endsAt (never expires)", () => {
    const bounty = makeCandidate({ endsAt: null });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(1);
  });

  it("includes global bounties (groups is empty) regardless of groupId", () => {
    const bounty = makeCandidate({ groups: [] });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(1);
  });

  it("includes group-scoped bounties when groups contains the matching groupId", () => {
    const bounty = makeCandidate({ groups: [{ groupId: GROUP_ID }] });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(1);
  });

  it("excludes group-scoped bounties when groups contains only a different groupId", () => {
    const bounty = makeCandidate({ groups: [{ groupId: OTHER_GROUP_ID }] });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(0);
  });

  it("includes group-scoped bounties when groups contains the matching groupId alongside others", () => {
    const bounty = makeCandidate({
      groups: [{ groupId: OTHER_GROUP_ID }, { groupId: GROUP_ID }],
    });
    const result = filterActiveGroupBounties([bounty], { groupId: GROUP_ID, now: NOW });
    expect(result).toHaveLength(1);
  });

  it("filters multiple bounties correctly in a mixed set", () => {
    const bounties = [
      makeCandidate({ id: "bnty_1", archivedAt: new Date("2025-01-01T00:00:00.000Z") }),
      makeCandidate({ id: "bnty_2", startsAt: new Date("2025-07-01T00:00:00.000Z") }),
      makeCandidate({ id: "bnty_3", endsAt: NOW }),
      makeCandidate({ id: "bnty_4", groups: [] }),
      makeCandidate({ id: "bnty_5", groups: [{ groupId: GROUP_ID }] }),
      makeCandidate({ id: "bnty_6", groups: [{ groupId: OTHER_GROUP_ID }] }),
    ];

    const result = filterActiveGroupBounties(bounties, { groupId: GROUP_ID, now: NOW });
    expect(result.map((b) => b.id)).toEqual(["bnty_4", "bnty_5"]);
  });
});
