import { Customer, Link, ProgramEnrollment } from "@dub/prisma/client";

export interface CustomerWithLink extends Customer {
  link?:
    | (Link & {
        programEnrollment?: ProgramEnrollment | null;
      })
    | null;
}

export const transformCustomer = (customer: CustomerWithLink) => {
  return {
    ...customer,
    partner: customer.link?.programEnrollment
      ? {
          id: customer.link.programEnrollment.partnerId,
          shortLink: customer.link.shortLink,
          couponId: customer.link.programEnrollment.couponId,
        }
      : null,
  };
};
