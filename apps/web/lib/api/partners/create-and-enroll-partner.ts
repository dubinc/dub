"use server";

import { createId } from "@/lib/api/create-id";
import { isStored, storage } from "@/lib/storage";
import { CreatePartnerProps, ProgramProps, WorkspaceProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { DubApiError } from "../errors";
import { getGroupOrThrow } from "../groups/get-group-or-throw";
import { createPartnerDefaultLinks } from "./create-partner-default-links";
import { throwIfExistingTenantEnrollmentExists } from "./throw-if-existing-tenant-id-exists";

interface CreateAndEnrollPartnerInput {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled" | "plan">;
  program: Pick<ProgramProps, "id" | "defaultFolderId" | "defaultGroupId">;
  partner: Omit<CreatePartnerProps, "linkProps">;
  link?: CreatePartnerProps["linkProps"];
  status?: ProgramEnrollmentStatus;
  skipEnrollmentCheck?: boolean;
  enrolledAt?: Date;
  userId: string;
}

export const createAndEnrollPartner = async ({
  workspace,
  program,
  partner,
  link,
  status = "approved",
  skipEnrollmentCheck = false,
  enrolledAt,
  userId,
}: CreateAndEnrollPartnerInput) => {
  if (!skipEnrollmentCheck) {
    // Check if the partner is already enrolled in the program by tenantId or email
    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        OR: [
          ...(partner.tenantId
            ? [
                {
                  tenantId: partner.tenantId,
                },
              ]
            : []),
          {
            partner: {
              email: partner.email,
            },
          },
        ],
      },
      include: {
        partner: true,
        links: true,
      },
    });

    // If the partner is already enrolled in the program
    if (programEnrollment) {
      // If there is no tenantId passed, or the tenantId is the same as the existing enrollment
      // return the existing enrollment
      if (
        !partner.tenantId ||
        partner.tenantId === programEnrollment.tenantId
      ) {
        return EnrolledPartnerSchema.parse({
          ...programEnrollment.partner,
          ...programEnrollment,
          id: programEnrollment.partner.id,
          links: programEnrollment.links,
        });
        // else, if the passed tenantId is different from the existing enrollment...
      } else if (partner.tenantId) {
        await throwIfExistingTenantEnrollmentExists({
          tenantId: partner.tenantId,
          programId: program.id,
        });

        // else, update the existing enrollment with the new tenantId
        const updatedProgramEnrollment = await prisma.programEnrollment.update({
          where: {
            id: programEnrollment.id,
          },
          data: {
            tenantId: partner.tenantId,
          },
          include: {
            partner: true,
            links: true,
          },
        });

        return EnrolledPartnerSchema.parse({
          ...updatedProgramEnrollment.partner,
          ...updatedProgramEnrollment,
          id: updatedProgramEnrollment.partner.id,
          links: updatedProgramEnrollment.links,
        });
      }
    } else if (partner.tenantId) {
      await throwIfExistingTenantEnrollmentExists({
        tenantId: partner.tenantId,
        programId: program.id,
      });
    }
  }

  const finalGroupId = partner.groupId || program.defaultGroupId;

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
    includeExpandedFields: true,
  });

  const payload: Pick<Prisma.PartnerUpdateInput, "programs"> = {
    programs: {
      create: {
        id: createId({ prefix: "pge_" }),
        programId: program.id,
        tenantId: partner.tenantId,
        status,
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

  // Create the partner links based on group defaults
  const links = await createPartnerDefaultLinks({
    workspace: {
      id: workspace.id,
      plan: workspace.plan,
    },
    program: {
      id: program.id,
      defaultFolderId: program.defaultFolderId,
    },
    partner: {
      id: upsertedPartner.id,
      name: partner.name,
      email: partner.email,
      username: partner.username,
      tenantId: partner.tenantId,
    },
    group: {
      defaultLinks: group.partnerGroupDefaultLinks,
      utmTemplate: group.utmTemplate,
    },
    link,
    userId,
  });

  const enrolledPartner = EnrolledPartnerSchema.parse({
    ...upsertedPartner,
    ...upsertedPartner.programs[0],
    id: upsertedPartner.id,
    links,
  });

  waitUntil(
    Promise.all([
      // upload partner image to R2
      partner.image &&
        !isStored(partner.image) &&
        storage
          .upload({
            key: `partners/${upsertedPartner.id}/image_${nanoid(7)}`,
            body: partner.image,
          })
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
