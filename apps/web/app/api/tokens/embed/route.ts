import { DubApiError } from "@/lib/api/errors";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/embed/embed-token";
import { ProgramProps, WorkspaceProps } from "@/lib/types";
import { createPartnerSchema } from "@/lib/zod/schemas/partners";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/tokens/embed - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const {
      programId,
      partnerId,
      tenantId,
      partner: partnerProps,
    } = createEmbedTokenSchema.parse(await parseRequestBody(req));

    let programEnrollment: Pick<ProgramEnrollment, "partnerId"> | null = null;

    // find the program enrollment for the given partnerId or tenantId
    if (partnerId || tenantId) {
      programEnrollment = await prisma.programEnrollment.findUnique({
        where: partnerId
          ? { partnerId_programId: { partnerId, programId } }
          : { tenantId_programId: { tenantId: tenantId!, programId } },
        select: {
          partnerId: true,
        },
      });
    }

    // check if the partner exists based on the email and create or enroll them
    else if (partnerProps) {
      const program = await prisma.program.findUnique({
        where: {
          id: programId,
        },
        select: {
          id: true,
          workspaceId: true,
          defaultFolderId: true,
          domain: true,
          url: true,
        },
      });

      if (!program || program.workspaceId !== workspace.id) {
        throw new DubApiError({
          message: `Program with ID ${programId} not found.`,
          code: "not_found",
        });
      }

      const partner = await prisma.partner.findUnique({
        where: {
          email: partnerProps.email,
        },
        include: {
          programs: {
            where: {
              programId,
            },
          },
        },
      });

      // partner does not exist, we need to create them
      if (!partner) {
        console.log("partner does not exist, we need to create them");

        const newPartner = await createPartner(partnerProps);

        const enrolledPartner = await enrollPartnerInProgram({
          workspace: {
            id: workspace.id,
            plan: workspace.plan,
            webhookEnabled: workspace.webhookEnabled,
          },
          program: {
            id: programId,
            defaultFolderId: program.defaultFolderId,
            domain: program.domain,
            url: program.url,
          },
          partner: {
            id: newPartner.id,
            tenantId: partnerProps.tenantId,
            linkProps: partnerProps.linkProps,
            username: partnerProps.username,
          },
          userId: session.user.id,
        });

        programEnrollment = {
          partnerId: enrolledPartner.id,
        };
      }

      // partner exists but is not enrolled in the program, we need to enroll them
      else if (partner.programs.length === 0) {
        console.log(
          "partner exists but is not enrolled in the program, we need to enroll them",
        );

        const enrolledPartner = await enrollPartnerInProgram({
          workspace: {
            id: workspace.id,
            plan: workspace.plan,
            webhookEnabled: workspace.webhookEnabled,
          },
          program: {
            id: programId,
            defaultFolderId: program.defaultFolderId,
            domain: program.domain,
            url: program.url,
          },
          partner: {
            id: partner.id,
            tenantId: partnerProps.tenantId,
            linkProps: partnerProps.linkProps,
            username: partnerProps.username,
          },
          userId: session.user.id,
        });

        programEnrollment = {
          partnerId: enrolledPartner.id,
        };
      }

      // partner exists and is enrolled in the program, we can use the existing partnerId
      else {
        console.log(
          "partner exists and is enrolled in the program, we can use the existing partnerId",
        );

        programEnrollment = {
          partnerId: partner.programs[0].partnerId,
        };
      }
    }

    if (!programEnrollment) {
      throw new DubApiError({
        message: `Partner with ${partnerId ? "ID" : "tenantId"} ${
          partnerId ?? tenantId
        } is not enrolled in this program (${programId}).`,
        code: "not_found",
      });
    }

    const response = await embedToken.create({
      programId,
      partnerId: programEnrollment.partnerId,
    });

    return NextResponse.json(EmbedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);

type CreatePartnerProps = z.infer<typeof createPartnerSchema>;

// Create a new partner
const createPartner = async ({
  name,
  email,
  country,
  image,
  description,
}: Pick<
  CreatePartnerProps,
  "name" | "email" | "country" | "image" | "description"
>) => {
  if (!email) {
    throw new DubApiError({
      message: "Must provide an email address.",
      code: "bad_request",
    });
  }

  const partner = await prisma.partner.upsert({
    where: {
      email,
    },
    create: {
      id: createId({ prefix: "pn_" }),
      email,
      name,
      country,
      image,
      description,
    },
    update: {},
  });

  console.log("createPartner", partner);

  return partner;
};

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

  // const enrolledPartner = EnrolledPartnerSchema.parse({
  //   ...programEnrollment,
  //   ...programEnrollment.program,
  //   ...programEnrollment.partner,
  //   id: programEnrollment.partnerId,
  //   status: programEnrollment.status,
  //   links: [partnerLink],
  // });

  const enrolledPartner = {
    ...programEnrollment,
    ...programEnrollment.program,
    ...programEnrollment.partner,
    id: programEnrollment.partnerId,
    status: programEnrollment.status,
    links: [partnerLink],
  };

  console.log("enrollPartnerInProgram", enrolledPartner);

  return enrolledPartner;
};
