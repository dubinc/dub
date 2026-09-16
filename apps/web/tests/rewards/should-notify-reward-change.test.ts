import { shouldNotifyRewardChange } from "@/lib/rewards/should-notify-reward-change";
import { describe, expect, test } from "vitest";

describe("shouldNotifyRewardChange", () => {
  test("1. create non-default reward - no notification", () => {
    expect(
      shouldNotifyRewardChange({
        action: "created",
        target: "group",
        isDefault: false,
        partnerCount: 5,
      }),
    ).toBe(false);
  });

  test("2. update non-default reward - yes when partners exist", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "group",
        isDefault: false,
        partnerCount: 2,
      }),
    ).toBe(true);
  });

  test("2b. update non-default reward - no when partner count is 0", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "group",
        isDefault: false,
        partnerCount: 0,
      }),
    ).toBe(false);
  });

  test("3. delete non-default reward - yes when partners exist", () => {
    expect(
      shouldNotifyRewardChange({
        action: "deleted",
        target: "group",
        isDefault: false,
        partnerCount: 1,
      }),
    ).toBe(true);
  });

  test("3b. delete non-default reward - no when partner count is 0", () => {
    expect(
      shouldNotifyRewardChange({
        action: "deleted",
        target: "group",
        isDefault: false,
        partnerCount: 0,
      }),
    ).toBe(false);
  });

  test("4. create default reward - yes when group has partners", () => {
    expect(
      shouldNotifyRewardChange({
        action: "created",
        target: "group",
        isDefault: true,
        partnerCount: 3,
      }),
    ).toBe(true);
  });

  test("4b. create default reward - no when group has 0 partners", () => {
    expect(
      shouldNotifyRewardChange({
        action: "created",
        target: "group",
        isDefault: true,
        partnerCount: 0,
      }),
    ).toBe(false);
  });

  test("5. update default reward - yes when partners exist", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "group",
        isDefault: true,
        partnerCount: 4,
      }),
    ).toBe(true);
  });

  test("5b. update default reward - no when partner count is 0", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "group",
        isDefault: true,
        partnerCount: 0,
      }),
    ).toBe(false);
  });

  test("6. delete default reward - yes when partners exist", () => {
    expect(
      shouldNotifyRewardChange({
        action: "deleted",
        target: "group",
        isDefault: true,
        partnerCount: 2,
      }),
    ).toBe(true);
  });

  test("6b. delete default reward - no when partner count is 0", () => {
    expect(
      shouldNotifyRewardChange({
        action: "deleted",
        target: "group",
        isDefault: true,
        partnerCount: 0,
      }),
    ).toBe(false);
  });

  test("7. change the reward for a partner - always notify", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "partner",
      }),
    ).toBe(true);
  });

  test("8. change the reward for a link - always notify", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "link",
      }),
    ).toBe(true);
  });

  test("treats undefined partner count as notify for group updates", () => {
    expect(
      shouldNotifyRewardChange({
        action: "updated",
        target: "group",
        isDefault: true,
        partnerCount: undefined,
      }),
    ).toBe(true);
  });
});
