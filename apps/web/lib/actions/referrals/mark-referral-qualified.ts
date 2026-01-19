"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { trackLead } from "@/lib/api/conversions/track-lead";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { markReferralQualifiedSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { pick } from "@dub/utils";
import { authActionClient } from "../safe-action";

// Mark a partner referral as qualified
export const markReferralQualifiedAction = authActionClient
  .inputSchema(markReferralQualifiedSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const referral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (referral.status === ReferralStatus.qualified) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already qualified.",
      });
    }

    // Mark the referral as qualified
    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referralId,
        status: ReferralStatus.pending,
      },
      data: {
        status: ReferralStatus.qualified,
      },
    });

    // Find the default link for the partner
    const links = await prisma.link.findMany({
      where: {
        programId,
        partnerId: referral.partnerId,
        partnerGroupDefaultLinkId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    });

    if (links.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "No default link found for the partner.",
      });
    }

    // Record a fake click
    const clickEvent = await recordFakeClick({
      link: pick(links[0], ["id", "url", "domain", "key", "projectId"]),
    });

    // Create a customer
    const customer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name: referral.name,
        email: referral.email,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        programId,
        partnerId: referral.partnerId,
        linkId: clickEvent.link_id,
        clickId: clickEvent.click_id,
      },
    });

    // Track the lead
    await trackLead({
      clickId: clickEvent.click_id,
      eventName: "Qualified Lead",
      customerExternalId: customer.externalId!,
      customerName: customer.name,
      customerEmail: customer.email,
      mode: "wait",
      rawBody: {},
      workspace: pick(workspace, ["id", "stripeConnectId", "webhookEnabled"]),
    });

    return updatedReferral;
  });
