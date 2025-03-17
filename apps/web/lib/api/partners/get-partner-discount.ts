import { prisma } from "@dub/prisma";
import { includePartnerAndDiscount } from "./include-partner";

// Get the partner and discount for a link
export const getPartnerAndDiscount = async (linkId: string) => {
  const { programEnrollment, program } = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
    include: includePartnerAndDiscount,
  });

  return {
    partner: programEnrollment?.partner || undefined,
    discount:
      programEnrollment?.discount || program?.defaultDiscount || undefined,
  };
};
