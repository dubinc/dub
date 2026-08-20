import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { subHours } from "date-fns";
import { randomName, randomPartnerEmail } from "../../utils";
import { PLAYWRIGHT_API_BASE } from "../constants";
import type { ApiClient } from "../fixtures";
import {
  campaignContent,
  createCampaign,
  createPartnerTag,
  deleteCampaign,
  deletePartnerTag,
} from "./helpers";

export const enrolledDaysCondition = {
  attribute: "partnerEnrolledDays",
  operator: "gte",
  value: 1,
} as const;

export async function publishTransactionalCampaign(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  const { status, data } = await createCampaign(api);
  expect(status).toEqual(201);

  const patched = await api.patch(`/api/campaigns/${data.id}`, {
    ...campaignContent({
      triggerConditions: [enrolledDaysCondition],
      ...overrides,
    }),
    status: "active",
    ...overrides,
  });

  expect(patched.status).toEqual(200);
  return data.id;
}

export async function getCampaignWorkflow(campaignId: string) {
  return prisma.workflow.findFirstOrThrow({
    where: {
      campaign: {
        id: campaignId,
      },
    },
  });
}

export async function runScheduledCampaignWorkflow(workflowId: string) {
  const response = await fetch(
    `${PLAYWRIGHT_API_BASE}/api/cron/workflows/${workflowId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );
  const message = await response.text();

  expect(response.status).toEqual(200);

  if (message.includes("disabled")) {
    return "disabled";
  }

  if (message.includes("not found")) {
    return "not found";
  }

  return "finished";
}

export async function createTestPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  const { status, data } = await api.post<EnrolledPartnerProps>(
    "/api/partners",
    {
      name: randomName("partner"),
      email: randomPartnerEmail(),
      ...overrides,
    },
  );

  expect(status).toEqual(201);
  return data;
}

export async function createPartnerMailbox(partnerId: string) {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
    select: { email: true, name: true },
  });

  const user = await prisma.user.create({
    data: {
      id: createId({ prefix: "user_" }),
      email: partner.email!,
      name: partner.name,
      emailVerified: new Date(),
      defaultPartnerId: partnerId,
    },
  });

  await prisma.partnerUser.create({
    data: {
      userId: user.id,
      partnerId,
      role: "owner",
      notificationPreferences: {
        create: {},
      },
    },
  });

  return user.id;
}

export async function backdateEnrollment({
  partnerId,
  programId,
  hoursAgo,
}: {
  partnerId: string;
  programId: string;
  hoursAgo: number;
}) {
  await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    data: {
      createdAt: subHours(new Date(), hoursAgo),
    },
  });
}

export async function setEnrollmentStatus({
  partnerId,
  programId,
  status,
}: {
  partnerId: string;
  programId: string;
  status: "pending" | "approved" | "banned";
}) {
  await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    data: { status },
  });
}

export async function setLinkStats({
  partnerId,
  programId,
  leads,
  conversions,
  saleAmount,
}: {
  partnerId: string;
  programId: string;
  leads?: number;
  conversions?: number;
  saleAmount?: number;
}) {
  const link = await prisma.link.findFirst({
    where: { partnerId, programId },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  expect(link).not.toBeNull();

  await prisma.link.update({
    where: { id: link!.id },
    data: {
      ...(leads !== undefined && { leads }),
      ...(conversions !== undefined && { conversions }),
      ...(saleAmount !== undefined && { saleAmount }),
    },
  });
}

export async function createTestCommission({
  programId,
  partnerId,
  earnings,
}: {
  programId: string;
  partnerId: string;
  earnings: number;
}) {
  return prisma.commission.create({
    data: {
      id: createId({ prefix: "cm_" }),
      programId,
      partnerId,
      type: "sale",
      amount: earnings,
      quantity: 1,
      earnings,
      status: "pending",
    },
  });
}

export async function tagPartner({
  programId,
  partnerId,
  partnerTagId,
}: {
  programId: string;
  partnerId: string;
  partnerTagId: string;
}) {
  await prisma.programPartnerTag.create({
    data: {
      programId,
      partnerId,
      partnerTagId,
    },
  });
}

export async function insertCampaignEmail({
  campaignId,
  programId,
  partnerId,
  recipientUserId,
}: {
  campaignId: string;
  programId: string;
  partnerId: string;
  recipientUserId: string;
}) {
  return prisma.notificationEmail.create({
    data: {
      id: createId({ prefix: "em_" }),
      type: "Campaign",
      emailId: `pw_${nanoid()}`,
      campaignId,
      programId,
      partnerId,
      recipientUserId,
    },
  });
}

export async function campaignEmails(campaignId: string, partnerId?: string) {
  return prisma.notificationEmail.findMany({
    where: {
      campaignId,
      type: "Campaign",
      ...(partnerId && { partnerId }),
    },
  });
}

export async function expectCampaignEmailCount({
  campaignId,
  partnerId,
  count,
}: {
  campaignId: string;
  partnerId?: string;
  count: number;
}) {
  const emails = await campaignEmails(campaignId, partnerId);
  expect(
    emails,
    count > 0
      ? "expected a campaign NotificationEmail (SMTP/MailHog or Resend must be configured)"
      : "did not expect a campaign NotificationEmail",
  ).toHaveLength(count);
  return emails;
}

export async function createTestGroup(api: ApiClient) {
  const slug = `g-${nanoid(8).toLowerCase()}`;
  const { status, data } = await api.post<{ id: string }>("/api/groups", {
    name: randomName("group"),
    slug,
    color: "blue",
  });

  expect(status).toEqual(201);
  return data.id;
}

export async function deleteTestGroup(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/groups/${id}`);
}

export async function deleteTestPartner(partnerId: string | undefined) {
  if (!partnerId) return;

  const partnerUsers = await prisma.partnerUser.findMany({
    where: { partnerId },
    select: { userId: true },
  });

  await prisma.notificationEmail.deleteMany({
    where: { partnerId },
  });

  await prisma.commission.deleteMany({
    where: { partnerId },
  });

  await prisma.customer.deleteMany({
    where: { partnerId },
  });

  await prisma.programPartnerTag.deleteMany({
    where: { partnerId },
  });

  if (partnerUsers.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: partnerUsers.map((row) => row.userId),
        },
      },
    });
  }

  await prisma.link.deleteMany({
    where: { partnerId },
  });

  await prisma.programEnrollment.deleteMany({
    where: { partnerId },
  });

  // Prisma partner.delete hits a PlanetScale relation quirk; raw SQL matches
  // bulkDeletePartners cleanup used by e2e cron. Use Prisma so cleanup hits
  // DATABASE_URL, not PLANETSCALE_DATABASE_URL.
  await prisma.$executeRaw`DELETE FROM Partner WHERE id = ${partnerId}`;
}

export async function cleanupCampaign(api: ApiClient, campaignId?: string) {
  if (!campaignId) return;
  await prisma.notificationEmail.deleteMany({
    where: { campaignId },
  });
  await deleteCampaign(api, campaignId);
}

type CreatePartnerOptions = {
  mailbox?: boolean;
  hoursAgo?: number | null;
  groupId?: string;
};

export function createCampaignSession(
  api: ApiClient,
  program: { id: string; defaultGroupId: string },
) {
  const partnerIds: string[] = [];
  const campaignIds: string[] = [];
  const groupIds: string[] = [];
  const tagIds: string[] = [];
  const programId = program.id;

  return {
    programId,
    defaultGroupId: program.defaultGroupId,

    trackPartner(partnerId: string) {
      partnerIds.push(partnerId);
    },

    trackCampaign(campaignId: string) {
      campaignIds.push(campaignId);
    },

    async createGroup() {
      const groupId = await createTestGroup(api);
      groupIds.push(groupId);
      return groupId;
    },

    async createTag() {
      const tag = await createPartnerTag(programId);
      tagIds.push(tag.id);
      return tag;
    },

    async setup(overrides: Record<string, unknown> = {}) {
      const campaignId = await publishTransactionalCampaign(api, overrides);
      campaignIds.push(campaignId);
      const workflow = await getCampaignWorkflow(campaignId);

      return {
        id: campaignId,
        workflow,

        async createPartner(options: CreatePartnerOptions = {}) {
          const partner = await createTestPartner(api, {
            ...(options.groupId && { groupId: options.groupId }),
          });
          partnerIds.push(partner.id);

          if (options.mailbox !== false) {
            await createPartnerMailbox(partner.id);
          }

          if (options.hoursAgo !== null) {
            await backdateEnrollment({
              partnerId: partner.id,
              programId,
              hoursAgo: options.hoursAgo ?? 18,
            });
          }

          return partner;
        },

        async run() {
          return runScheduledCampaignWorkflow(workflow.id);
        },

        async expectSentTo(partner: Pick<EnrolledPartnerProps, "id">) {
          await expectCampaignEmailCount({
            campaignId,
            partnerId: partner.id,
            count: 1,
          });
        },

        async expectNotSentTo(partner: Pick<EnrolledPartnerProps, "id">) {
          await expectCampaignEmailCount({
            campaignId,
            partnerId: partner.id,
            count: 0,
          });
        },

        async disableWorkflow() {
          await prisma.workflow.update({
            where: { id: workflow.id },
            data: { disabledAt: new Date() },
          });
        },
      };
    },

    async cleanup() {
      for (const partnerId of partnerIds) {
        await deleteTestPartner(partnerId);
      }
      for (const campaignId of campaignIds) {
        await cleanupCampaign(api, campaignId);
      }
      for (const tagId of tagIds) {
        await deletePartnerTag(tagId);
      }
      for (const groupId of groupIds) {
        await deleteTestGroup(api, groupId);
      }
    },
  };
}

export type CampaignSession = ReturnType<typeof createCampaignSession>;
export type ScheduledCampaign = Awaited<
  ReturnType<CampaignSession["setup"]>
>;
