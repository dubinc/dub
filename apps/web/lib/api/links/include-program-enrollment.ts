import { Prisma } from "@dub/prisma/client";

export const includeProgramEnrollment = {
  programEnrollment: {
    select: {
      groupId: true,
      programPartnerTags: {
        select: {
          partnerTag: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LinkInclude;
