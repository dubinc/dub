import { Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { prisma } from "../prisma";
import { updatePartnerTagSchema } from "../zod/schemas/partner-tags";

type UpdatePartnerTagInput = z.infer<typeof updatePartnerTagSchema> & {
  programId: string;
};

export async function updatePartnerTag({
  partnerTagId,
  name,
  programId,
}: UpdatePartnerTagInput) {
  try {
    return await prisma.partnerTag.update({
      where: {
        id: partnerTagId,
        programId,
      },
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A partner tag with that name already exists.",
        });
      }

      if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message: "Partner tag not found.",
        });
      }
    }

    throw error;
  }
}
