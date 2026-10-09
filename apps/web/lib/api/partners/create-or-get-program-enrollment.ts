import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { Prisma, ProgramEnrollment } from "@prisma/client";
import { DubApiError } from "../errors";

export function programPartnerTagsInclude(programId: string) {
  return {
    // Deleted tags have a null programId until background cleanup removes their associations.
    where: {
      partnerTag: {
        programId,
      },
    },
    include: {
      partnerTag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  } satisfies Prisma.ProgramEnrollmentInclude["programPartnerTags"];
}

type EnrollmentProgramPartnerTags = Prisma.ProgramEnrollmentGetPayload<{
  include: {
    programPartnerTags: ReturnType<typeof programPartnerTagsInclude>;
  };
}>["programPartnerTags"];

export function partnerTagsFromEnrollment(
  programPartnerTags: EnrollmentProgramPartnerTags,
) {
  return programPartnerTags.map(({ partnerTag }) => partnerTag);
}

// Attempts to create a program enrollment.
// If another request creates it concurrently, returns the existing enrollment.
export async function createOrGetProgramEnrollment({
  programId,
  partnerId,
  tenantId,
  status,
  groupId,
  clickRewardId,
  leadRewardId,
  saleRewardId,
  referralRewardId,
  customRewardId,
  discountId,
  enrolledAt,
}: Pick<
  ProgramEnrollment,
  | "partnerId"
  | "programId"
  | "tenantId"
  | "status"
  | "groupId"
  | "clickRewardId"
  | "leadRewardId"
  | "saleRewardId"
  | "referralRewardId"
  | "customRewardId"
  | "discountId"
> & {
  enrolledAt?: Date;
}) {
  try {
    const programEnrollment = await prisma.programEnrollment.create({
      data: {
        id: createId({ prefix: "pge_" }),
        partnerId,
        programId,
        tenantId,
        status,
        groupId,
        clickRewardId,
        leadRewardId,
        saleRewardId,
        referralRewardId,
        customRewardId,
        discountId,
        ...(enrolledAt && {
          createdAt: enrolledAt,
        }),
      },
      include: {
        partner: {
          include: {
            platforms: true,
          },
        },
      },
    });

    return {
      programEnrollment,
      created: true as const,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.info(
        "[createOrGetProgramEnrollment] Unique constraint conflict (P2002), falling back to find",
        { target: error.meta?.target },
      );

      // Same partner already enrolled (concurrent create on partnerId_programId)
      let programEnrollment = await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          links: true,
          partner: {
            include: {
              platforms: true,
            },
          },
          programPartnerTags: programPartnerTagsInclude(programId),
        },
      });

      if (programEnrollment) {
        if (!tenantId || tenantId === programEnrollment.tenantId) {
          return {
            programEnrollment,
            created: false as const,
          };
        }

        throw new DubApiError({
          message: `The tenantId '${tenantId}' is already in associated with another partner in this program.`,
          code: "conflict",
        });
      }
    }

    throw error;
  }
}
