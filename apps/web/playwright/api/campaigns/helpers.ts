import type { Campaign } from "@/lib/types";
import type { CampaignType } from "@prisma/client";
import { randomName } from "../../utils";
import type { ApiClient } from "../fixtures";

export type CampaignJson = Omit<
  Campaign,
  "scheduledAt" | "createdAt" | "updatedAt"
> & {
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const defaultTransactionalTrigger = {
  attribute: "partnerJoined",
  operator: "gte",
  value: 0,
} as const;

export function campaignContent(overrides: Record<string, unknown> = {}) {
  return {
    name: randomName("campaign"),
    subject: randomName("subject"),
    bodyJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Test campaign body" }],
        },
      ],
    },
    ...overrides,
  };
}

export async function createCampaign(
  api: ApiClient,
  type: CampaignType = "transactional",
) {
  return api.post<{ id: string }>("/api/campaigns", { type });
}

export async function deleteCampaign(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/campaigns/${id}`);
}
