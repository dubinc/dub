import { Reward } from "@dub/prisma/client";
import { describe, expect, test, vi } from "vitest";
import { resolveClickRewardAmount } from "../../app/(ee)/api/cron/aggregate-clicks/resolve-click-reward-amount";
import { IntegrationHarness } from "../utils/integration";

// Mock server-only module
vi.mock("server-only", () => ({}));

const REWARD_ID = "rw_ZE0KAEtZuOGwNHtoVm1U0JpF";

describe.sequential("Click reward resolution", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  // Fetch the reward from the API
  const { status, data: reward } = await http.get<Reward>({
    path: `/rewards/${REWARD_ID}`,
  });

  if (status !== 200 || !reward) {
    throw new Error(`Failed to fetch reward from API: ${status}`);
  }

  test("countries in modifier list (US, GB, AU) get modifier amount", () => {
    // The reward has modifiers: US, GB, AU should get 100 cents
    const modifierCountries = ["US", "GB", "AU"];

    modifierCountries.forEach((country) => {
      const amount = resolveClickRewardAmount({
        reward,
        country,
      });

      expect(amount).toBe(100);
    });
  });

  test("countries not in modifier list get base amount", () => {
    // The reward base amount is 20 cents
    // Countries not in the modifier list should get the base amount
    const otherCountries = ["CA", "FR", "DE", "JP"];

    otherCountries.forEach((country) => {
      const amount = resolveClickRewardAmount({
        reward,
        country,
      });

      expect(amount).toBe(20);
    });
  });

  test("all countries return expected amounts", () => {
    // Test all countries to ensure correct behavior
    const testCases = [
      { country: "US", expected: 100 },
      { country: "GB", expected: 100 },
      { country: "AU", expected: 100 },
      { country: "CA", expected: 20 },
      { country: "FR", expected: 20 },
      { country: "DE", expected: 20 },
      { country: "JP", expected: 20 },
    ];

    testCases.forEach(({ country, expected }) => {
      const amount = resolveClickRewardAmount({
        reward,
        country,
      });

      expect(amount).toBe(expected);
    });
  });
});
