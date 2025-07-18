"use server";

import { createId } from "@/lib/api/create-id";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import {
  CreatePartnerProps,
  ProgramPartnerLinkProps,
  ProgramProps,
  RewardProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
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
  reward,
  discountId,
  tenantId,
  status = "approved",
  skipEnrollmentCheck = false,
  enrolledAt,
}: {
  program: Pick<ProgramProps, "id" | "defaultFolderId">;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  link: ProgramPartnerLinkProps;
  partner: Pick<
    CreatePartnerProps,
    "email" | "name" | "image" | "country" | "description"
  >;
  reward?: Pick<RewardProps, "id" | "event">;
  discountId?: string;
  tenantId?: string;
  status?: ProgramEnrollmentStatus;
  skipEnrollmentCheck?: boolean;
  enrolledAt?: Date;
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

  const [defaultRewards, allDiscounts] = await prisma.$transaction([
    prisma.reward.findMany({
      where: {
        programId: program.id,
        // if a specific reward is provided, exclude it from the default rewards because it'll be added below
        ...(reward && {
          event: {
            not: reward.event,
          },
        }),
        default: true,
      },
    }),
    prisma.discount.findMany({
      where: {
        programId: program.id,
      },
    }),
  ]);

  const finalAssignedRewards = {
    ...Object.fromEntries(
      defaultRewards.map((r) => [REWARD_EVENT_COLUMN_MAPPING[r.event], r.id]),
    ),
    ...(reward && {
      [REWARD_EVENT_COLUMN_MAPPING[reward.event]]: reward.id,
    }),
  };

  const finalAssignedDiscount = discountId
    ? allDiscounts.find((d) => d.id === discountId)?.id // we need to filter by this in case an invalid discountId is passed
    : allDiscounts.find((d) => d.default)?.id;

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
        ...finalAssignedRewards,
        discountId: finalAssignedDiscount,
        ...(enrolledAt && {
          createdAt: enrolledAt,
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
      name: partner.name || partner.email,
      email: partner.email,
      image: partner.image && !isStored(partner.image) ? null : partner.image,
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
    Promise.all([
      // update and record link
      prisma.link
        .update({
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
        })
        .then((link) =>
          Promise.allSettled([
            linkCache.delete({
              domain: link.domain,
              key: link.key,
            }),

            recordLink(link),

            link.saleAmount > 0 &&
              backfillLinkCommissions({
                id: link.id,
                partnerId: upsertedPartner.id,
                programId: program.id,
              }),
          ]),
        ),

      // upload partner image to R2
      partner.image &&
        !isStored(partner.image) &&
        storage
          .upload(
            `partners/${upsertedPartner.id}/image_${nanoid(7)}`,
            partner.image,
          )
          .then(async ({ url }) => {
            await prisma.partner.update({
              where: {
                id: upsertedPartner.id,
              },
              data: {
                image: url,
              },
            });
          }),

      // send partner.enrolled webhook
      sendWorkspaceWebhook({
        workspace,
        trigger: "partner.enrolled",
        data: enrolledPartner,
      }),
    ]),
  );

  return enrolledPartner;
};
