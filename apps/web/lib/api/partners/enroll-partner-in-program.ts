import { DubApiError } from "@/lib/api/errors";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { createId } from "@/lib/api/utils";
import { CreatePartnerProps, ProgramProps, WorkspaceProps } from "@/lib/types";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";

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

  return EnrolledPartnerSchema.parse({
    ...programEnrollment,
    ...programEnrollment.partner,
    id: programEnrollment.partnerId,
    status: programEnrollment.status,
    links: [partnerLink],
  });
};
