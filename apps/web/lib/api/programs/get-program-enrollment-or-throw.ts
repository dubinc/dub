import { PartnerGroupProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { DubApiError } from "../errors";

export async function getProgramEnrollmentOrThrow({
  partnerId,
  programId,
  includePartner = false,
  includeClickReward = false,
  includeLeadReward = false,
  includeSaleReward = false,
  includeDiscount = false,
  includeGroup = false,
  includeWorkspace = false,
}: {
  partnerId: string;
  programId: string;
  includePartner?: boolean;
  includeClickReward?: boolean;
  includeLeadReward?: boolean;
  includeSaleReward?: boolean;
  includeDiscount?: boolean;
  includeGroup?: boolean;
  includeWorkspace?: boolean;
}) {
  const include: Prisma.ProgramEnrollmentInclude = {
    program: includeWorkspace
      ? {
          include: {
            workspace: true,
          },
        }
      : true,
    links: {
      orderBy: {
        createdAt: "asc",
      },
    },
    ...(includePartner && {
      partner: true,
    }),
    ...(includeClickReward && {
      clickReward: true,
    }),
    ...(includeLeadReward && {
      leadReward: true,
    }),
    ...(includeSaleReward && {
      saleReward: true,
    }),
    ...(includeDiscount && {
      discount: true,
    }),
    ...(includeGroup && {
      partnerGroup: true,
    }),
  };

  const programEnrollment = programId.startsWith("prog_")
    ? await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include,
      })
    : await prisma.programEnrollment.findFirst({
        where: {
          partnerId,
          program: {
            slug: programId,
          },
        },
        include,
      });

  if (!programEnrollment || !programEnrollment.program) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You are not enrolled in this program. Contact your program admin to get enrolled.",
    });
  }

  return {
    ...programEnrollment,
    group: programEnrollment.partnerGroup as PartnerGroupProps,
  };
}
