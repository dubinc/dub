"use server";

import { trackLead } from "@/lib/api/conversions/track-lead";
import { createId } from "@/lib/api/create-id";
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
      partnerGroupDefaultLinkId: {
        not: null,
      },
    },
    orderBy: {
      partnerGroupDefaultLinkId: "asc",
    },
  });

  if (links.length === 0) {
    return;
  }

  const partnerLink = links[0];

  // Record a fake click
  const clickEvent = await recordFakeClick({
    link: pick(partnerLink, ["id", "url", "domain", "key", "projectId"]),
  });

  // Use provided externalId or fallback to referral email
  const customerExternalId = externalId || referral.email;

  // Create a customer
  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      name: referral.name,
      email: referral.email,
      externalId: customerExternalId,
      projectId: workspace.id,
      projectConnectId: workspace.stripeConnectId,
      programId: referral.programId,
      partnerId: referral.partnerId,
      linkId: clickEvent.link_id,
      clickId: clickEvent.click_id,
    },
  });

  // Track the qualified lead
  await trackLead({
    clickId: clickEvent.click_id,
    eventName: "Qualified Lead",
    customerExternalId,
    customerName: customer.name,
    customerEmail: customer.email,
    mode: "wait",
    rawBody: {},
    workspace: pick(workspace, ["id", "stripeConnectId", "webhookEnabled"]),
    source: "submitted",
  });

  // Update the referral with the customer ID
  await prisma.partnerReferral.update({
    where: {
      id: referral.id,
    },
    data: {
      customerId: customer.id,
    },
  });
};
