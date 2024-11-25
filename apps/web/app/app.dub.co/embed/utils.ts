import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const getLinkAndProgram = async (linkToken: string) => {
  const token = await prisma.embedPublicToken.findUnique({
    where: {
      publicToken: linkToken,
      expires: {
        gt: new Date(),
      },
    },
  });

  if (!token) {
    notFound();
  }

  const linkAndProgram = await prisma.link.findUnique({
    where: {
      id: token.linkId,
    },
    include: {
      program: true,
    },
  });

  if (!linkAndProgram) {
    notFound();
  }

  const { program, ...link } = linkAndProgram;

  if (!program) {
    notFound();
  }

  return {
    program,
    link,
  };
};
