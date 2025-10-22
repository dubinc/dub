import { updateCampaignSchema } from "@/lib/zod/schemas/campaigns";
import { Campaign } from "@dub/prisma/client";
import { z } from "zod";

interface ValidateCampaignParams {
  input: Partial<z.infer<typeof updateCampaignSchema>>;
  campaign: Campaign;
}

export function validateCampaign({ input, campaign }: ValidateCampaignParams) {
  // if (input.status === CampaignStatus.scheduled) {
  //   if (!input.scheduledAt) {
  //     throw new DubApiError({
  //       code: "bad_request",
  //       message: "Date is required to schedule a campaign.",
  //     });
  //   }

  //   if (new Date(scheduledAt) <= new Date()) {
  //     throw new DubApiError({
  //       code: "bad_request",
  //       message: "Scheduled date must be in the future.",
  //     });
  //   }
  // }

  return input;
}
