"use server";

import { trackLead } from "@/lib/api/conversions/track-lead";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { notifyReferralStatusUpdate } from "@/lib/api/referrals/notify-referral-status-update";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { markReferralQualifiedSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { pick } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Mark a partner referral as qualified
export const markReferralQualifiedAction = authActionClient
  .inputSchema(markReferralQualifiedSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, externalId, notes } = parsedInput;

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
    await prisma.partnerReferral.update({
      where: {
        id: referralId,
        status: ReferralStatus.pending,
      },
      data: {
        status: ReferralStatus.qualified,
      },
    });

    waitUntil(
      (async () => {
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
            programId,
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
          workspace: pick(workspace, [
            "id",
            "stripeConnectId",
            "webhookEnabled",
          ]),
          source: "submitted",
        });

        // Update the referral with the customer ID
        await prisma.partnerReferral.update({
          where: {
            id: referralId,
          },
          data: {
            customerId: customer.id,
          },
        });

        await notifyReferralStatusUpdate({
          referral,
          programId,
          status: ReferralStatus.qualified,
          notes,
        });
      })(),
    );
  });
