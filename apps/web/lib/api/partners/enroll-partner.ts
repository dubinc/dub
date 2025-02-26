"use server";

import { ErrorCodes } from "@/lib/api/errors";
import { createId } from "@/lib/api/utils";
import { recordLink } from "@/lib/tinybird";
import {
  ProgramPartnerLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { createLink } from "../links/create-link";
import { includeTags } from "../links/include-tags";
import { processLink } from "../links/process-link";

// TODO:
// update enrollPartner to accept a optional linkId and move link creation here


export const enrollPartner = async ({
  program,
  tenantId,
  workspace,
  link,
  partner,
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
}) => {
  if (partner.email) {
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
          },
          include: includeTags,
        })
        .then((link) => recordLink(link)),

      sendWorkspaceWebhook({
        workspace,
        trigger: "partner.created",
        data: enrolledPartner,
      }),
    ]),
  );

  return enrolledPartner;
};

// a variant of enrollPartner that creates a link and enrolls a partner
export const createLinkAndEnrollPartner = async ({
  workspace,
  program,
  partner,
  userId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "id" | "defaultFolderId" | "domain" | "url">;
  partner: z.infer<typeof createPartnerSchema>;
  userId: string;
}) => {
  if (!program.domain || !program.url) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "You need to set a domain and url for this program before creating a partner.",
    });
  }

  const {
    name,
    email,
    image,
    country,
    description,
    tenantId,
    linkProps,
    username,
    programId,
  } = partner;

  const { link, error, code } = await processLink({
    workspace,
    userId,
    payload: {
      ...linkProps,
      domain: program.domain,
      key: username,
      url: program.url,
      programId,
      tenantId,
      folderId: program.defaultFolderId,
      trackConversion: true,
    },
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  const partnerLink = await createLink(link);

  waitUntil(
    sendWorkspaceWebhook({
      trigger: "link.created",
      workspace,
      data: linkEventSchema.parse(partnerLink),
    }),
  );

  return await enrollPartner({
    program,
    tenantId,
    link: partnerLink,
    workspace,
    partner: {
      name,
      email,
      image,
      country,
      description,
    },
  });
};
