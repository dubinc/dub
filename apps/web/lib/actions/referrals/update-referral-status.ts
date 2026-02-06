"use server";

import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { markReferralClosedWon } from "@/lib/api/referrals/mark-referral-closed-won";
import { markReferralQualified } from "@/lib/api/referrals/mark-referral-qualified";
import { notifyReferralStatusUpdate } from "@/lib/api/referrals/notify-referral-status-update";
import {
  REFERRAL_STATUS_TO_ACTIVITY_ACTION,
  REFERRAL_STATUS_TRANSITIONS,
} from "@/lib/referrals/constants";
import { ReferralWithCustomer } from "@/lib/types";
import { updateReferralStatusSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const updateReferralStatusAction = authActionClient
  .inputSchema(updateReferralStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId, status, notes } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    let referral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (!REFERRAL_STATUS_TRANSITIONS[referral.status].includes(status)) {
      throw new DubApiError({
        code: "bad_request",
        message: `Cannot transition from ${referral.status} to ${status}.`,
      });
    }

    if (referral.status === status) {
      throw new DubApiError({
        code: "bad_request",
        message: "Referral is already in this status.",
      });
    }

    if (status === ReferralStatus.closedWon && !referral.customer) {
      throw new DubApiError({
        code: "bad_request",
        message: "This referral does not have a customer associated with it.",
      });
    }

    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referral.id,
        status: referral.status,
      },
      data: {
        status,
      },
      include: {
        customer: true,
      },
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          notifyReferralStatusUpdate({
            referral,
            notes,
          }),

          trackActivityLog({
            workspaceId: workspace.id,
            programId,
            resourceType: "referral",
            resourceId: referral.id,
            userId: user.id,
            action: REFERRAL_STATUS_TO_ACTIVITY_ACTION[status],
            description: notes,
            changeSet: {
              status: {
                old: referral.status,
                new: updatedReferral.status,
              },
            },
          }),

          ...(status === ReferralStatus.qualified
            ? [
                markReferralQualified({
                  workspace,
                  referral: updatedReferral,
                  externalId: parsedInput.externalId ?? null,
                }),
              ]
            : []),

          ...(status === ReferralStatus.closedWon
            ? [
                markReferralClosedWon({
                  workspace,
                  referral: updatedReferral as ReferralWithCustomer,
                  saleAmount: parsedInput.saleAmount,
                  stripeCustomerId: parsedInput.stripeCustomerId ?? null,
                }),
              ]
            : []),
        ]);
      })(),
    );
  });
