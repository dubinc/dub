import { ProgramEnrollment } from "@prisma/client";

export type RewardOverrideIds = Pick<
  ProgramEnrollment,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
>;

export type RewardOverrideIdsInput = Partial<RewardOverrideIds>;
export type EnrollmentRewardIds = RewardOverrideIds;
export type EnrollmentRewardIdsInput = RewardOverrideIdsInput;
export type LinkRewardIds = RewardOverrideIds;
export type LinkRewardIdsInput = RewardOverrideIdsInput;

export const REWARD_OVERRIDE_ID_KEYS = [
  "clickRewardId",
  "leadRewardId",
  "saleRewardId",
  "discountId",
] as const;

// Keep explicit ids, including the group default. Link-level null means inherit
// from the partner, so a selected group default must be stored as that id.
export const pickDefinedRewardIds = (
  rewardIds: RewardOverrideIdsInput,
): RewardOverrideIdsInput => {
  const result: RewardOverrideIdsInput = {};

  for (const key of REWARD_OVERRIDE_ID_KEYS) {
    const value = rewardIds[key];
    if (value === undefined) {
      continue;
    }

    result[key] = value;
  }

  return result;
};

// Maps *RewardId / discountId fields to ProgramPartnerLinkSchemaInternal names.
export const toPartnerLinkRewardIdFields = (
  linkReward: RewardOverrideIdsInput | null | undefined,
) => ({
  clickReward: linkReward?.clickRewardId ?? null,
  leadReward: linkReward?.leadRewardId ?? null,
  saleReward: linkReward?.saleRewardId ?? null,
  discount: linkReward?.discountId ?? null,
});

// True when any reward/discount field was sent, including explicit null clears.
export const hasRewardIdsInput = (rewardIds: RewardOverrideIdsInput) => {
  return REWARD_OVERRIDE_ID_KEYS.some((key) => rewardIds[key] !== undefined);
};

// True when any field assigns a non-null reward/discount id (not a clear).
export const hasRewardAssignment = (rewardIds: RewardOverrideIdsInput) => {
  return REWARD_OVERRIDE_ID_KEYS.some((key) => {
    const id = rewardIds[key];
    return id !== undefined && id !== null;
  });
};
