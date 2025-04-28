"use server";

import { createId } from "@/lib/api/create-id";
import { determinePartnerDiscount } from "@/lib/partners/determine-partner-discount";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-rewards";
import { recordLink } from "@/lib/tinybird";
import {
  CreatePartnerProps,
  ProgramPartnerLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { linkCache } from "../links/cache";
import { includeTags } from "../links/include-tags";
import { backfillLinkCommissions } from "./backfill-link-commissions";

export const createAndEnrollPartner = async ({
  program,
  workspace,
  link,
  partner,
  rewardId,
  discountId,
  tenantId,
  status = "approved",
  skipEnrollmentCheck = false,
}: {
  program: Pick<
    ProgramProps,
    "id" | "defaultFolderId" | "defaultRewardId" | "defaultDiscountId"
  >;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  link: ProgramPartnerLinkProps;
  partner: Pick<
    CreatePartnerProps,
    "email" | "name" | "image" | "country" | "description"
  >;
  rewardId?: string;
  discountId?: string;
  tenantId?: string;
  status?: ProgramEnrollmentStatus;
  skipEnrollmentCheck?: boolean;
}) => {
  if (!skipEnrollmentCheck && partner.email) {
    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        partner: {
          email: partner.email,
        },
      },
    });

    if (programEnrollment) {
      throw new DubApiError({
        message: `Partner ${partner.email} already enrolled in this program.`,
        code: "conflict",
      });
    }
  }

  // Check if the tenantId is already enrolled in the program
  if (tenantId) {
    const tenantEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId,
          programId: program.id,
        },
      },
    });

    if (tenantEnrollment) {
      throw new DubApiError({
        message: `Tenant ${tenantId} already enrolled in this program.`,
        code: "conflict",
      });
    }
  }

  const payload: Pick<Prisma.PartnerUpdateInput, "programs"> = {
    programs: {
      create: {
        programId: program.id,
        tenantId,
        status,
        links: {
          connect: {
            id: link.id,
          },
        },
        ...(rewardId &&
          rewardId !== program.defaultRewardId && {
            rewards: {
              create: {
                rewardId,
              },
            },
          }),
        ...(discountId &&
          discountId !== program.defaultDiscountId && {
            discountId,
          }),
      },
    },
  };

  const upsertedPartner = await prisma.partner.upsert({
    where: {
      email: partner.email ?? "",
    },
    update: payload,
    create: {
      ...payload,
      id: createId({ prefix: "pn_" }),
      name: partner.name,
      email: partner.email,
      image: partner.image,
      country: partner.country,
      description: partner.description,
    },
    include: {
      programs: {
        where: {
          programId: program.id,
        },
      },
    },
  });

  const enrolledPartner = EnrolledPartnerSchema.parse({
    ...upsertedPartner,
    ...upsertedPartner.programs[0],
    id: upsertedPartner.id,
    links: [link],
  });

  waitUntil(
    (async () => {
      const updatedLink = await prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          programId: program.id,
          partnerId: upsertedPartner.id,
          folderId: program.defaultFolderId,
          trackConversion: true,
        },
        include: includeTags,
      });

      const [rewards, discount] = await Promise.all([
        determinePartnerRewards({
          programId: program.id,
          partnerId: enrolledPartner.id,
        }),

        determinePartnerDiscount({
          programId: program.id,
          partnerId: enrolledPartner.id,
        }),
      ]);

      await Promise.allSettled([
        linkCache.delete({
          domain: updatedLink.domain,
          key: updatedLink.key,
        }),

        recordLink(updatedLink),

        updatedLink.saleAmount > 0 &&
          backfillLinkCommissions({
            id: link.id,
            partnerId: upsertedPartner.id,
            programId: program.id,
          }),

        sendWorkspaceWebhook({
          workspace,
          trigger: "partner.enrolled",
          data: {
            ...enrolledPartner,
            rewards,
            discount,
          },
        }),
      ]);
    })(),
  );

  return enrolledPartner;
};
