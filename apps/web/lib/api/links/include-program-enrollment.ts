import { Prisma } from "@/lib/prisma/client";

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
