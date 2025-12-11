import { Customer } from "@dub/prisma/client";

export const isFirstConversion = ({
  customer,
  linkId,
}: {
  customer: Pick<Customer, "sales" | "linkId">;
  linkId?: string;
}) => {
  // if this is the first sale for the customer, it's a first conversion
  if (customer.sales === 0) {
    return true;
  }

  // if customer has sales, but the original referral link is not the same as the current link
  // it is most likely a first conversion
  if (customer.linkId !== linkId) {
    // TODO: fix edge case where customer was brought in by a different link, but then had recurring sales on the current link
    return true;
  }

  return false;
};
