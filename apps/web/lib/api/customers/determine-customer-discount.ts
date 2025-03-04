import { Commission, Discount } from "@prisma/client";
import { differenceInMonths } from "date-fns";

type CustomerWithLink = {
  link: {
    programEnrollment: {
      program: {
        defaultDiscount: Discount;
      };
      discount: Discount | null;
    };
  };
};

export const determineCustomerDiscount = (
  customer: CustomerWithLink,
  firstPurchase: Pick<Commission, "createdAt"> | null,
) => {
  // Use the partner discount or fallback to the program discount
  const discount =
    customer.link?.programEnrollment?.discount ||
    customer.link?.programEnrollment?.program.defaultDiscount ||
    null;

  if (!discount) {
    return null;
  }

  // Lifetime discount
  if (discount.maxDuration === null) {
    return discount;
  }

  // No purchase yet so we can apply the discount
  if (!firstPurchase) {
    return discount;
  }

  const monthsDifference = differenceInMonths(
    new Date(),
    firstPurchase.createdAt,
  );

  return monthsDifference < discount.maxDuration ? discount : null;
};
