import { generateRandomName } from "@/lib/names";
import {
  Customer,
  Discount,
  Link,
  Partner,
  ProgramEnrollment,
} from "@dub/prisma/client";

export interface CustomerWithLink extends Customer {
  link?:
    | (Link & {
        programEnrollment?:
          | (ProgramEnrollment & {
              partner: Partner;
              discount: Discount | null;
              program: {
                defaultDiscount: Discount;
              };
            })
          | null;
      })
    | null;
  discount?: Discount | null;
}

export const transformCustomer = (customer: CustomerWithLink) => {
  const programEnrollment = customer.link?.programEnrollment;

  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
    link: customer.link || undefined,
    partner: programEnrollment?.partner || undefined,
  };
};
