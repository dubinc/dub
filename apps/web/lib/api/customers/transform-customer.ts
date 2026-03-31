import { generateRandomName } from "@/lib/names";
import {
  Customer,
  Discount,
  Link,
  Partner,
  ProgramEnrollment,
} from "@dub/prisma/client";

export interface CustomerWithLink extends Customer {
  link?: Link | null;
  programEnrollment?:
    | (ProgramEnrollment & {
        partner: Partner;
        discount?: Discount | null;
      })
    | null;
}

export const transformCustomer = (customer: CustomerWithLink) => {
  const programEnrollment = customer.programEnrollment;

  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
    link: customer.link || undefined,
    programId: programEnrollment?.programId || undefined,
    partner: programEnrollment?.partner || undefined,
    discount: programEnrollment?.discount || undefined,
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
