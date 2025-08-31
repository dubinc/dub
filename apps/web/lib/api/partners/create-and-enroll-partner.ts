"use server";

import { createId } from "@/lib/api/create-id";
import { isStored, storage } from "@/lib/storage";
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
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { getGroupOrThrow } from "../groups/get-group-or-throw";
import { linkCache } from "../links/cache";
import { includeTags } from "../links/include-tags";
import { backfillLinkCommissions } from "./backfill-link-commissions";

export const createAndEnrollPartner = async ({
  program,
  workspace,
  link,
  partner,
  tenantId,
  groupId,
  status = "approved",
  skipEnrollmentCheck = false,
  enrolledAt,
}: {
  program: Pick<ProgramProps, "id" | "defaultFolderId" | "defaultGroupId">;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  link: ProgramPartnerLinkProps;
  partner: Pick<
    CreatePartnerProps,
    "email" | "name" | "image" | "country" | "description"
  >;
  tenantId?: string;
  groupId?: string | null;
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

  const finalGroupId = groupId || program.defaultGroupId;
  // this should never happen, but just in case
  if (!finalGroupId) {
    throw new DubApiError({
      message:
        "There was no group ID provided, and the program does not have a default group. Please contact support.",
      code: "bad_request",
    });
  }

  const group = await getGroupOrThrow({
    programId: program.id,
    groupId: finalGroupId,
    includeRewardsAndDiscount: true,
  });

  const payload: Pick<Prisma.PartnerUpdateInput, "programs"> = {
    programs: {
      create: {
        id: createId({ prefix: "pge_" }),
        programId: program.id,
        tenantId,
        status,
        links: {
          connect: {
            id: link.id,
          },
        },
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
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
