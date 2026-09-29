import { INFINITY_NUMBER } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
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
      throw new Error(
        workspace.partnerTagsLimit === 0
          ? "Partner tags are not available on your plan. Upgrade to create partner tags."
          : `You've reached the maximum of ${workspace.partnerTagsLimit} partner tags per program on your plan. Upgrade to Advanced or Enterprise for unlimited partner tags.`,
      );
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
      throw new Error("A partner tag with that name already exists.");
    }

    throw error;
  }
}
