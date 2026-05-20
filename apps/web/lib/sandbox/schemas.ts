import * as z from "zod/v4";

export const copyRewardToLiveSchema = z.object({
  workspaceId: z.string(),
  rewardId: z.string(),
  targetGroupId: z.string(),
});

export const copyDiscountToLiveSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
  targetGroupId: z.string(),
});
