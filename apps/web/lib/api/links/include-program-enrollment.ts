import { Prisma } from "@dub/prisma/client";

export const includeProgramEnrollment = {
  programEnrollment: {
    select: {
      groupId: true,
    },
  },
} satisfies Prisma.LinkInclude;
