import { prisma } from "@/lib/prisma";
import type { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import type { Workflow } from "@prisma/client";
import { randomName } from "../../utils";
import { trackClick, trackLead, trackSale } from "../conversions/helpers";
import type { ApiClient } from "../fixtures";

export type MoveRule = {
  attribute: string;
  operator: string;
  value: number | string | string[] | { min: number; max: number };
};

export function uniqueThreshold() {
  return 10_000 + Math.floor(Math.random() * 1_000_000);
}

export async function createGroup(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  const slug = `g-${nanoid(8).toLowerCase()}`;
  const { status, data } = await api.post<GroupProps>("/api/groups", {
    name: randomName("group"),
    slug,
    color: "blue",
    ...overrides,
  });

  expect(status).toEqual(201);
  return data;
}

// Best effort: the response is ignored so cleanup stays safe for groups a test
// already deleted itself.
export async function deleteGroup(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/groups/${id}`);
}

export async function setMoveRules(
  api: ApiClient,
  groupId: string,
  moveRules: MoveRule[] | undefined,
) {
  return api.patch<GroupProps>(`/api/groups/${groupId}`, {
    ...(moveRules !== undefined && { moveRules }),
  });
}

export async function setGroupMoveDisabledAt(
  api: ApiClient,
  {
    partnerId,
    groupId,
    groupMoveDisabledAt,
  }: {
    partnerId: string;
    groupId: string;
    groupMoveDisabledAt: Date | string;
  },
) {
  const { status } = await api.post(`/api/groups/${groupId}/partners`, {
    partnerIds: [partnerId],
    groupMoveDisabledAt,
  });

  expect(status).toEqual(200);
}

export async function getGroup(
  api: ApiClient,
  groupId: string,
): Promise<{ status: number; data: GroupProps }> {
  return api.get<GroupProps>(`/api/groups/${groupId}`);
}

export async function trackPartnerLead(
  partner: Pick<EnrolledPartnerProps, "links">,
) {
  const link = partner.links![0];
  const { clickId } = await trackClick({ domain: link.domain, key: link.key });

  return trackLead({ clickId });
}

export async function trackPartnerSale(
  partner: Pick<EnrolledPartnerProps, "links">,
  overrides: Record<string, unknown> = {},
) {
  const link = partner.links![0];
  const { clickId } = await trackClick({ domain: link.domain, key: link.key });
  const { customer } = await trackLead({ clickId });

  return trackSale({
    customerExternalId: customer.externalId,
    ...overrides,
  });
}

export async function getGroupWorkflow(
  groupId: string,
): Promise<Workflow | null> {
  return prisma.workflow.findFirst({
    where: {
      partnerGroup: {
        id: groupId,
      },
    },
  });
}

export async function disableWorkflow(workflowId: string) {
  return prisma.workflow.update({
    where: {
      id: workflowId,
    },
    data: {
      disabledAt: new Date(),
    },
  });
}

export async function getEnrollment({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) {
  return prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      groupId: true,
      groupMoveDisabledAt: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
      clickRewardId: true,
      referralRewardId: true,
    },
  });
}

export async function expectPartnerInGroup({
  partnerId,
  programId,
  expectedGroupId,
}: {
  partnerId: string;
  programId: string;
  expectedGroupId: string;
}) {
  await expect
    .poll(async () => {
      const enrollment = await getEnrollment({ partnerId, programId });
      return enrollment.groupId;
    })
    .toBe(expectedGroupId);

  return getEnrollment({ partnerId, programId });
}

export async function expectPartnerStaysInGroup({
  partnerId,
  programId,
  expectedGroupId,
}: {
  partnerId: string;
  programId: string;
  expectedGroupId: string;
}) {
  // Give executeWorkflows (waitUntil after /track/lead) time to run (and skip).
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  const enrollment = await getEnrollment({ partnerId, programId });
  expect(enrollment.groupId).toBe(expectedGroupId);
  return enrollment;
}

export async function seedLinkStats(
  linkId: string,
  {
    leads,
    conversions,
    saleAmount,
  }: {
    leads?: number;
    conversions?: number;
    saleAmount?: number;
  },
) {
  await prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      ...(leads !== undefined && { leads }),
      ...(conversions !== undefined && { conversions }),
      ...(saleAmount !== undefined && { saleAmount }),
    },
  });
}

export async function countGroupChangeActivityLogs({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) {
  return prisma.activityLog.count({
    where: {
      programId,
      resourceType: "partner",
      resourceId: partnerId,
      action: "partner.groupChanged",
    },
  });
}

// removeGroupIdFromMoveRules runs in a waitUntil after DELETE /groups/:id, so
// the scrubbed conditions land shortly after the response.
export async function expectMoveRules({
  groupId,
  expected,
}: {
  groupId: string;
  expected: MoveRule[];
}) {
  await expect
    .poll(
      async () => {
        const workflow = await getGroupWorkflow(groupId);
        return workflow?.triggerConditions ?? null;
      },
      { timeout: 15_000 },
    )
    .toEqual(expected);
}

export async function getPartnerGroupRewards(groupId: string) {
  return prisma.partnerGroup.findUniqueOrThrow({
    where: {
      id: groupId,
    },
    select: {
      id: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
      clickRewardId: true,
      referralRewardId: true,
    },
  });
}
