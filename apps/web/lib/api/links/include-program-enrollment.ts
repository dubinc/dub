import { Prisma } from "@dub/prisma/types";

export const includeProgramEnrollment = {
  programEnrollment: {
    select: {
      groupId: true,
    },
  },
} satisfies Prisma.LinkInclude;
