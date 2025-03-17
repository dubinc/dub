import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

const selectDiscount = {
  id: true,
  amount: true,
  maxDuration: true,
  type: true,
  couponId: true,
  couponTestId: true,
};

export const includePartnerAndDiscount = {
  program: {
    select: {
      defaultDiscount: {
        select: selectDiscount,
      },
    },
  },

  programEnrollment: {
    select: {
      partner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      discount: {
        select: selectDiscount,
      },
    },
  },
} satisfies Prisma.LinkInclude;

// Get the partner and discount for a link
export const getPartnerAndDiscount = async (linkId: string) => {
  const { programEnrollment, program } = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
    include: includePartnerAndDiscount,
  });


  const partner = programEnrollment?.partner || undefined;
  const discount =
    programEnrollment?.discount || program?.defaultDiscount || undefined;

  return {
    partner,
    discount,
  };
};
