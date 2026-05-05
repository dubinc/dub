import { Prisma } from "@dub/prisma/client";

export const includeProgramEnrollment = {
  programEnrollment: {
    select: {
      groupId: true,
      programPartnerTags: {
        select: {
          partnerTagId: true,
        },
      },
    },
  },
} satisfies Prisma.LinkInclude;
