import { generateRandomName } from "@/lib/names";
import { Customer, Link } from "@prisma/client";

export interface CustomerWithLink extends Customer {
  link?: Link | null;
}

export const transformCustomer = (customer: CustomerWithLink) => {
  return {
    ...customer,
    name: customer.name || customer.email || generateRandomName(),
    link: customer.link || undefined,
  };
};
