import * as z from "zod/v4";

export const copyRewardToLiveSchema = z.object({
  workspaceId: z.string().min(1),
  rewardId: z.string().min(1),
  targetGroupId: z.string().min(1),
});

export const copyDiscountToLiveSchema = z.object({
  workspaceId: z.string().min(1),
  discountId: z.string().min(1),
  targetGroupId: z.string().min(1),
});
