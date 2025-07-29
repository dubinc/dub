import { CustomerProps, LinkProps, PartnerProps } from "../types";

// Detect and log the fraud events (clicks, leads and sales)
export const detectFraudEvent = async ({
  click,
  link,
  customer,
  partner,
}: {
  link: Pick<LinkProps, "id" | "programId">;
  click: { url: string };
  customer: Pick<CustomerProps, "email">;
  partner: Pick<PartnerProps, "email">;
}) => {
  // TODO:
  // Finalize the logic for detecting fraud events

  return true;
};
