import * as z from "zod/v4";
import { prisma } from "../prisma";
import { getPartnerTagsCountQuerySchema } from "../zod/schemas/partner-tags";

type CountPartnerTagsInput = z.infer<typeof getPartnerTagsCountQuerySchema> & {
  programId: string;
};

export async function countPartnerTags({
  programId,
  search,
}: CountPartnerTagsInput) {
  return prisma.partnerTag.count({
    where: {
      programId,
      ...(search && {
        name: {
          contains: search,
        },
      }),
    },
  });
}
