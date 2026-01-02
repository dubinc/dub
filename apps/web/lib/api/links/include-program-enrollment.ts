import { Prisma } from "@dub/prisma";

export const includeProgramEnrollment = {
  programEnrollment: {
    select: {
      groupId: true,
    },
  },
} satisfies Prisma.LinkInclude;
