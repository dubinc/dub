import { Commission, Discount } from "@prisma/client";
import { differenceInMonths } from "date-fns";

type CustomerWithLink = {
  link?: {
    programEnrollment?: {
      discount?: Discount | null;
      program?: {
        defaultDiscount?: Discount;
      };
    } | null;
  } | null;
};

export const determineCustomerDiscount = ({
  customerLink,
  firstPurchase,
}: {
  customerLink: CustomerWithLink["link"];
  firstPurchase?: Pick<Commission, "createdAt"> | null;
}) => {
  // Use the partner discount or fallback to the program discount
  const discount =
    customerLink?.programEnrollment?.discount ||
    customerLink?.programEnrollment?.program?.defaultDiscount ||
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
