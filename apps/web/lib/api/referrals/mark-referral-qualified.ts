"use server";

import { trackLead } from "@/lib/api/conversions/track-lead";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { prisma } from "@dub/prisma";
import { PartnerReferral, Project } from "@dub/prisma/client";
import { pick } from "@dub/utils";

interface MarkReferralQualifiedInput {
  workspace: Pick<Project, "id" | "stripeConnectId" | "webhookEnabled">;
  referral: PartnerReferral;
  externalId: string | null;
}

// Mark a partner referral as qualified
export const markReferralQualified = async ({
  workspace,
  referral,
  externalId,
}: MarkReferralQualifiedInput) => {
  // Find the default link for the partner
  const links = await prisma.link.findMany({
    where: {
      programId: referral.programId,
      partnerId: referral.partnerId,
    },
    orderBy: {
      partnerGroupDefaultLinkId: "asc",
    },
  });

  if (links.length === 0) {
    console.error(
      `[markReferralQualified] No links found for partner ${referral.partnerId} in program ${referral.programId}`,
    );
    return;
  }

  const partnerLink = links[0];

  // Record a fake click
  const clickEvent = await recordFakeClick({
    link: pick(partnerLink, ["id", "url", "domain", "key", "projectId"]),
  });

  // Track the qualified lead
  const trackedLead = await trackLead({
    clickId: clickEvent.click_id,
    eventName: "Qualified Lead",
    customerExternalId: externalId || referral.email,
    mode: "wait",
    rawBody: {},
    workspace: pick(workspace, ["id", "stripeConnectId", "webhookEnabled"]),
    source: "submitted",
  });

  const customer = await prisma.customer.findUniqueOrThrow({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: trackedLead.customer.externalId!,
      },
    },
  });

  await prisma.partnerReferral.update({
    where: {
      id: referral.id,
    },
    data: {
      customerId: customer.id,
    },
  });
};
