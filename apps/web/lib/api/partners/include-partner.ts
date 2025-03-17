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
