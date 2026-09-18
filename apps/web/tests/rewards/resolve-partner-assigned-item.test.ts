import { resolvePartnerAssignedItem } from "@/lib/rewards/resolve-partner-assigned-item";
import { describe, expect, test } from "vitest";

const groupDefault = { id: "rw_default" };
const override = { id: "rw_override" };

describe("resolvePartnerAssignedItem", () => {
  test("uses the listed item and marks defaults as not overrides", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: groupDefault.id,
        groupDefault,
        itemsById: new Map([[groupDefault.id, groupDefault]]),
        loading: false,
      }),
    ).toEqual({
      item: groupDefault,
      isOverride: false,
    });
  });

  test("preserves isOverride for a resolved non-default assignment", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: override.id,
        groupDefault,
        itemsById: new Map([[override.id, override]]),
        loading: false,
      }),
    ).toEqual({
      item: override,
      isOverride: true,
    });
  });

  test("falls back to the group default when the assigned id matches it", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: groupDefault.id,
        groupDefault,
        itemsById: new Map(),
        loading: false,
      }),
    ).toEqual({
      item: groupDefault,
      isOverride: false,
    });
  });

  test("falls back to the group default while the list request is loading", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: override.id,
        groupDefault,
        itemsById: new Map(),
        loading: true,
      }),
    ).toEqual({
      item: groupDefault,
      isOverride: false,
    });
  });

  test("keeps a missing non-default override absent after loading", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: override.id,
        groupDefault,
        itemsById: new Map(),
        loading: false,
      }),
    ).toBeNull();
  });

  test("uses the group default when no partner assignment is set", () => {
    expect(
      resolvePartnerAssignedItem({
        assignedId: null,
        groupDefault,
        itemsById: new Map(),
        loading: false,
      }),
    ).toEqual({
      item: groupDefault,
      isOverride: false,
    });
  });
});
