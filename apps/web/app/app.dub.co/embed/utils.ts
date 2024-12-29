import { embedToken } from "@/lib/embed/embed-token";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { notFound } from "next/navigation";

export const getEmbedData = async (token: string) => {
  const linkId = await embedToken.get(token);

  if (!linkId) {
    notFound();
  }

  const referralLink = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
    include: {
      program: true,
      programEnrollment: {
        select: {
          discount: true,
        },
      },
    },
  });

  if (!referralLink) {
    notFound();
  }

  const { program, programEnrollment, ...link } = referralLink;

  if (!program) {
    notFound();
  }

  return {
    program,
    link,
    discount: DiscountSchema.parse(programEnrollment?.discount),
    earnings:
      (program.commissionType === "percentage" ? link.saleAmount : link.sales) *
      (program.commissionAmount / 100),
  };
};
