"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { subMinutes } from "date-fns";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { createId } from "../api/create-id";
import { logger } from "../axiom/server";
import { qstash } from "../cron";
import { attributeReferringPartnerSchema } from "./schemas";

export const attributeReferringPartnerAction = authActionClient
  .inputSchema(attributeReferringPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, referredByPartnerId, createCommissionsForPastEvents } =
      parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (referredByPartnerId === partnerId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "A partner cannot be attributed to themselves as a referring partner.",
      });
    }

    const [programEnrollment, referringProgramEnrollment] = await Promise.all([
      getProgramEnrollmentOrThrow({
        partnerId,
        programId,
        include: {
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
          application: {
            select: {
              createdAt: true,
            },
          },
        },
      }),

      // Check the referring partner is enrolled in the program
      getProgramEnrollmentOrThrow({
        partnerId: referredByPartnerId,
        programId,
        include: {
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
          partner: {
            select: {
              country: true,
            },
          },
          referralReward: true,
        },
      }),
    ]);

    if (referringProgramEnrollment.status !== "approved") {
      throw new DubApiError({
        code: "bad_request",
        message: "The referring partner is not enrolled in the program.",
      });
    }

    if (programEnrollment.applicationEvent?.referredByPartnerId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This partner has already been attributed to another referring partner.",
      });
    }

    await throwIfReferralLoop({
      programId,
      partnerId,
      initialReferrerId:
        referringProgramEnrollment.applicationEvent?.referredByPartnerId,
    });

    // Attribute the referring partner to the application
    const baseDate =
      programEnrollment.application?.createdAt ?? programEnrollment.createdAt;

    try {
      await prisma.programApplicationEvent.upsert({
        where: {
          programId_partnerId: {
            programId,
            partnerId,
          },
          referredByPartnerId: null,
        },
        update: {
          referredByPartnerId,
        },
        create: {
          id: createId({ prefix: "pga_evt_" }),
          programId,
          partnerId,
          referredByPartnerId,
          referralSource: "manual",
          country: referringProgramEnrollment.partner.country,
          visitedAt: subMinutes(baseDate, 30),
          startedAt: subMinutes(baseDate, 5),
          submittedAt: subMinutes(baseDate, 1),
          approvedAt: programEnrollment.createdAt,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "This partner already has a referring partner.",
        });
      }

      throw error;
    }

    if (
      createCommissionsForPastEvents &&
      referringProgramEnrollment.referralReward
    ) {
      try {
        await qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/backfill`,
          body: {
            programId,
            partnerId,
            referredByPartnerId,
          },
        });
      } catch (error) {
        logger.error("publishJSON.failed", {
          service: "qstash",
          event: "publishJSON.failed",
          url: `/api/cron/commissions/referrals/backfill`,
          errorName: error instanceof Error ? error.name : undefined,
          errorStack: error instanceof Error ? error.stack : undefined,
          correlation: {
            programId,
            partnerId,
          },
        });

        await logger.flush();
      }
    }
  });

async function throwIfReferralLoop({
  programId,
  partnerId,
  initialReferrerId,
}: {
  programId: string;
  partnerId: string;
  initialReferrerId: string | null | undefined;
}) {
  const visited = new Set<string>();
  let currentReferrerId = initialReferrerId;

  while (currentReferrerId) {
    if (currentReferrerId === partnerId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This referral relationship is not allowed because it would create a referral loop.",
      });
    }

    // Malformed data: ancestor chain already cycles (e.g. A→B→A) without
    // including partnerId — stop walking instead of looping forever.
    // Should never happen in practice
    if (visited.has(currentReferrerId)) {
      break;
    }

    visited.add(currentReferrerId);

    const applicationEvent = await prisma.programApplicationEvent.findUnique({
      where: {
        programId_partnerId: {
          programId,
          partnerId: currentReferrerId,
        },
      },
      select: {
        referredByPartnerId: true,
      },
    });

    currentReferrerId = applicationEvent?.referredByPartnerId ?? null;
  }
}
