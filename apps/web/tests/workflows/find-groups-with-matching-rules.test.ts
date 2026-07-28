import { findGroupsWithMatchingRules } from "@/lib/api/groups/find-groups-with-matching-rules";
import type { GroupMoveRules } from "@/lib/api/workflows/move-group/types";
import { describe, expect, it } from "vitest";

const groupA = { id: "grp_a", name: "Group A", moveRules: [] as GroupMoveRules };
const groupB = { id: "grp_b", name: "Group B", moveRules: [] as GroupMoveRules };
const groupC = { id: "grp_c", name: "Group C", moveRules: [] as GroupMoveRules };

describe("findGroupsWithMatchingRules", () => {
  it("returns no conflict when partnerGroup eq/in filters are disjoint", () => {
    groupB.moveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: "grp_source_a",
      },
    ];

    const currentRules: GroupMoveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: "grp_source_b",
      },
    ];

    expect(
      findGroupsWithMatchingRules({
        groups: [groupA, groupB, groupC],
        currentRules,
        currentGroupId: groupA.id,
      }),
    ).toEqual([]);
  });

  it("detects conflict when partnerGroup eq/in filters overlap", () => {
    groupB.moveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "in",
        value: ["grp_source_a", "grp_source_b"],
      },
    ];

    const currentRules: GroupMoveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: "grp_source_b",
      },
    ];

    expect(
      findGroupsWithMatchingRules({
        groups: [groupA, groupB, groupC],
        currentRules,
        currentGroupId: groupA.id,
      }),
    ).toEqual([{ id: groupB.id, name: groupB.name }]);
  });

  it("still detects metric conflicts when only one rule has partnerGroup", () => {
    groupB.moveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: "grp_source_a",
      },
    ];

    const currentRules: GroupMoveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
    ];

    expect(
      findGroupsWithMatchingRules({
        groups: [groupA, groupB, groupC],
        currentRules,
        currentGroupId: groupA.id,
      }),
    ).toEqual([{ id: groupB.id, name: groupB.name }]);
  });

  it("falls back to metric overlap when partnerGroup uses ne/notIn", () => {
    groupB.moveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "ne",
        value: "grp_source_a",
      },
    ];

    const currentRules: GroupMoveRules = [
      {
        attribute: "totalLeads",
        operator: "gte",
        value: 10,
      },
      {
        attribute: "partnerGroup",
        operator: "eq",
        value: "grp_source_a",
      },
    ];

    expect(
      findGroupsWithMatchingRules({
        groups: [groupA, groupB, groupC],
        currentRules,
        currentGroupId: groupA.id,
      }),
    ).toEqual([{ id: groupB.id, name: groupB.name }]);
  });
});
