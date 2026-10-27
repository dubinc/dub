import { generateRandomName } from "@/lib/names";
import {
  Customer,
  Discount,
  Link,
  Partner,
  ProgramEnrollment,
} from "@prisma/client";

export interface CustomerWithLink extends Customer {
  link?:
    | (Link & {
        linkReward?: {
          discount?: Discount | null;
        } | null;
      })
    | null;
  programEnrollment?:
    | (ProgramEnrollment & {
        partner: Partner;
        discount?: Discount | null;
      })
    | null;
}

export const transformCustomer = (customer: CustomerWithLink) => {
  const programEnrollment = customer.programEnrollment;

  // Prefer the link discount if it exists, otherwise use the enrollment discount
  const discount =
    customer.link?.linkReward?.discount ?? programEnrollment?.discount;

  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
    link: customer.link || undefined,
    programId: programEnrollment?.programId || undefined,
    partner: programEnrollment?.partner || undefined,
    discount: discount || undefined,
  };
};

export const transformCustomerForCommission = (customer?: Customer | null) => {
  if (!customer) {
    return customer;
  }

  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
  };
};
