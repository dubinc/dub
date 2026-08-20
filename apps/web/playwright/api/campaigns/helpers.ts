import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
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

export const defaultTransactionalTriggers = [
  {
    attribute: "partnerJoined",
    operator: "gte",
    value: 0,
  },
] as const;

export const multipleTriggerConditions = [
  {
    attribute: "totalConversions",
    operator: "gte",
    value: 50,
  },
  {
    attribute: "totalLeads",
    operator: "gte",
    value: 10,
  },
] as const;

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

export function mentionBodyJson(ids: readonly string[]) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: ids.map((id) => ({
          type: "mention",
          attrs: { id },
        })),
      },
    ],
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

export async function createPartnerTag(programId: string) {
  return prisma.partnerTag.create({
    data: {
      id: createId({ prefix: "ptag_" }),
      programId,
      name: randomName("tag"),
    },
  });
}

export async function deletePartnerTag(id: string | undefined) {
  if (!id) return;
  await prisma.partnerTag.delete({ where: { id } });
}
