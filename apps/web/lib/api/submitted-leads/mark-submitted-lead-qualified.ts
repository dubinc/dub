"use server";

import { trackLead } from "@/lib/api/conversions/track-lead";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { prisma } from "@dub/prisma";
import { Project, SubmittedLead } from "@dub/prisma/client";
import { pick } from "@dub/utils";

interface MarkSubmittedLeadQualifiedInput {
  workspace: Pick<Project, "id" | "stripeConnectId" | "webhookEnabled">;
  lead: SubmittedLead;
  externalId: string | null;
}

// Mark a submitted lead as qualified
export const markSubmittedLeadQualified = async ({
  workspace,
  lead,
  externalId,
}: MarkSubmittedLeadQualifiedInput) => {
  // Find the default link for the partner
  const links = await prisma.link.findMany({
    where: {
      programId: lead.programId,
      partnerId: lead.partnerId,
    },
    orderBy: {
      partnerGroupDefaultLinkId: "asc",
    },
    take: 1,
    include: {
      partner: true,
    },
  });

  if (links.length === 0) {
    console.error(
      `[markSubmittedLeadQualified] No links found for partner ${lead.partnerId} in program ${lead.programId}`,
    );
    return;
  }

  const partnerLink = links[0];

  // Record a fake click (use the partner's country if available)
  const clickEvent = await recordFakeClick({
    link: pick(partnerLink, ["id", "url", "domain", "key", "projectId"]),
    ...(partnerLink.partner?.country && {
      customer: {
        country: partnerLink.partner.country,
      },
    }),
  });

  // Track the qualified lead
  const trackedLead = await trackLead({
    clickId: clickEvent.click_id,
    eventName: "Qualified Lead",
    customerExternalId: externalId || lead.email,
    customerName: lead.name,
    customerEmail: lead.email,
    mode: "wait",
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

  await prisma.submittedLead.update({
    where: {
      id: lead.id,
    },
    data: {
      customerId: customer.id,
    },
  });
};
