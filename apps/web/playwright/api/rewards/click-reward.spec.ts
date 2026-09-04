import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import type { RewardConditionsArray } from "@/lib/types";
import { expect } from "@playwright/test";
import { EventType, Prisma, Reward, RewardStructure } from "@prisma/client";
import { resolveClickReward } from "../../../app/(ee)/api/cron/aggregate-clicks/resolve-click-reward-amount";
import { test } from "../fixtures";
import { createReward, deleteReward, updateReward } from "./helpers";

const countryInModifier: RewardConditionsArray = [
  {
    operator: "AND",
    type: RewardStructure.flat,
    amountInCents: 100,
    conditions: [
      {
        entity: "customer",
        attribute: "country",
        operator: "in",
        value: ["US", "GB", "AU"],
      },
    ],
  },
];

function resolvedAmount(reward: Reward, country: string) {
  const resolved = resolveClickReward({ reward, country });

  return getRewardAmount({
    type: resolved.type,
    amountInCents: resolved.amountInCents,
    amountInPercentage:
      resolved.amountInPercentage != null
        ? Number(resolved.amountInPercentage)
        : null,
  });
}

test.describe("Click reward resolution", () => {
  // Shared reward; serial so modifiers can be updated between tests.
  test.describe.configure({ mode: "serial" });

  let rewardId: string | undefined;

  test.beforeAll(async ({ program }) => {
    const reward = await createReward({
      programId: program.id,
      event: EventType.click,
      type: RewardStructure.flat,
      amountInCents: 20,
      modifiers: countryInModifier,
    });

    rewardId = reward.id;
  });

  test.afterAll(async () => {
    await deleteReward(rewardId);
  });

  test("countries in modifier list get modifier amount; others get base", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: countryInModifier,
    });

    const testCases = [
      { country: "US", expected: 100 },
      { country: "GB", expected: 100 },
      { country: "AU", expected: 100 },
      { country: "CA", expected: 20 },
      { country: "FR", expected: 20 },
      { country: "DE", expected: 20 },
      { country: "JP", expected: 20 },
    ];

    for (const { country, expected } of testCases) {
      expect(resolvedAmount(reward, country)).toBe(expected);
    }
  });

  test("equals_to country modifier matches only that country", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 100,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
      ],
    });

    expect(resolvedAmount(reward, "US")).toBe(100);
    expect(resolvedAmount(reward, "GB")).toBe(20);
    expect(resolvedAmount(reward, "CA")).toBe(20);
  });

  test("not_in country modifier excludes listed countries", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 100,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "not_in",
              value: ["US"],
            },
          ],
        },
      ],
    });

    expect(resolvedAmount(reward, "US")).toBe(20);
    expect(resolvedAmount(reward, "GB")).toBe(100);
    expect(resolvedAmount(reward, "CA")).toBe(100);
  });

  test("null modifiers always use base amount", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: Prisma.JsonNull,
    });

    expect(reward.modifiers).toBeNull();
    expect(resolvedAmount(reward, "US")).toBe(20);
    expect(resolvedAmount(reward, "GB")).toBe(20);
  });

  test("overlapping modifier groups pick the highest amount", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 100,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 250,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "in",
              value: ["US", "GB"],
            },
          ],
        },
      ],
    });

    expect(resolvedAmount(reward, "US")).toBe(250);
    expect(resolvedAmount(reward, "GB")).toBe(250);
    expect(resolvedAmount(reward, "CA")).toBe(20);
  });

  test("invalid modifiers JSON falls back to base amount", async () => {
    const reward = await updateReward(rewardId!, {
      modifiers: {},
    });

    expect(resolvedAmount(reward, "US")).toBe(20);
    expect(resolvedAmount(reward, "GB")).toBe(20);
  });
});
