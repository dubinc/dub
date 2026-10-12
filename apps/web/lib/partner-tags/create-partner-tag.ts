import { INFINITY_NUMBER } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { DubApiError } from "../api/errors";
import { prisma } from "../prisma";
import { WorkspaceProps } from "../types";

type CreatePartnerTagInput = {
  name: string;
  workspace: Pick<WorkspaceProps, "partnerTagsLimit">;
  programId: string;
};

export async function createPartnerTag({
  name,
  workspace,
  programId,
}: CreatePartnerTagInput) {
  if (workspace.partnerTagsLimit < INFINITY_NUMBER) {
    const tagsCount = await prisma.partnerTag.count({
      where: {
        programId,
      },
    });

    if (tagsCount >= workspace.partnerTagsLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message:
          workspace.partnerTagsLimit === 0
            ? "Partner tags are not available on your plan."
            : `You've reached the maximum of ${workspace.partnerTagsLimit} partner tags per program on your plan.`,
      });
    }
  }

  try {
    const partnerTag = await prisma.partnerTag.create({
      data: {
        id: createId({ prefix: "ptag_" }),
        programId,
        name,
      },
    });

    return partnerTag;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DubApiError({
        code: "conflict",
        message: "A partner tag with that name already exists.",
      });
    }

    throw error;
  }
}
