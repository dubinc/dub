import { embedToken } from "@/lib/embed/embed-token";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const getLinkAndProgram = async (token: string) => {
  const linkId = await embedToken.get(token);

  if (!linkId) {
    notFound();
  }

  const linkAndProgram = await prisma.link.findUnique({
    where: {
      id: linkId,
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
    earnings:
      (program.commissionType === "percentage" ? link.saleAmount : link.sales) *
      (program.commissionAmount / 100),
  };
};
