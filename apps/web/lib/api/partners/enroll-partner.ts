"use server";

import { createId } from "@/lib/api/utils";
import { recordLink } from "@/lib/tinybird";
import {
  ProgramPartnerLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { includeTags } from "../links/include-tags";
import { createPartnerLink } from "./create-partner-link";

export const enrollPartner = async ({
  program,
  tenantId,
  workspace,
  link,
  partner,
  skipPartnerCheck = false,
}: {
  program: Pick<ProgramProps, "id" | "defaultFolderId">;
  tenantId?: string;
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled">;
  partner: {
    name: string;
    email?: string | null;
    image?: string | null;
    country?: string | null;
    description?: string | null;
  };
  link: ProgramPartnerLinkProps;
  skipPartnerCheck?: boolean;
}) => {
  if (!skipPartnerCheck && partner.email) {
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
        links: {
          connect: {
            id: link.id,
          },
        },
        status: "approved",
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
      country: partner.country ?? "US",
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
        .then((link) => recordLink(link)),

      // TODO:
      // We should send this for new partners only and not for existing partners
      sendWorkspaceWebhook({
        workspace,
        trigger: "partner.created",
        data: enrolledPartner,
      }),
    ]),
  );

  return enrolledPartner;
};

type CreatePartnerProps = z.infer<typeof createPartnerSchema>;

// Enroll an existing partner in a program
export const enrollPartnerInProgram = async ({
  workspace,
  program,
  partner,
  userId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "webhookEnabled" | "plan">;
  program: Pick<ProgramProps, "id" | "defaultFolderId" | "url" | "domain">;
  partner: Pick<CreatePartnerProps, "tenantId" | "username" | "linkProps"> & {
    id: string;
  };
  userId: string;
}) => {
  const { id: partnerId, tenantId } = partner;

  const partnerEnrollment = await prisma.programEnrollment.findUnique({
    where: tenantId
      ? { tenantId_programId: { tenantId, programId: program.id } }
      : { partnerId_programId: { partnerId, programId: program.id } },
  });

  if (partnerEnrollment) {
    throw new DubApiError({
      message: `Partner with ${tenantId ? "tenantId" : "ID"} ${
        tenantId ?? partnerId
      } already enrolled in this program.`,
      code: "conflict",
    });
  }

  const partnerLink = await createPartnerLink({
    workspace,
    program,
    partner,
    userId,
  });

  console.log("createPartnerLink", partnerLink);

  const programEnrollment = await prisma.programEnrollment.create({
    data: {
      id: createId({ prefix: "pge_" }),
      programId: program.id,
      partnerId: partner.id,
      tenantId: partner.tenantId,
      status: "approved",
    },
    include: {
      program: true,
      partner: true,
    },
  });

  const enrolledPartner = EnrolledPartnerSchema.parse({
    ...programEnrollment,
    ...programEnrollment.program,
    ...programEnrollment.partner,
    id: programEnrollment.partnerId,
    links: [partnerLink],
  });

  console.log("enrollPartnerInProgram", enrolledPartner);

  return enrolledPartner;
};
