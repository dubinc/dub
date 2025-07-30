import { CustomerProps, LinkProps, PartnerProps } from "@/lib/types";

// Detect and log the fraud events (clicks, leads and sales)
export const detectFraudEvent = async ({
  partner,
  link,
  click,
  customer,
}: {
  partner: Pick<PartnerProps, "email">;
  link: Pick<LinkProps, "id" | "programId">;
  click: { url: string };
  customer: Pick<CustomerProps, "email">;
}) => {
  // TODO:
  // Finalize the logic for detecting fraud events

  return true;
};
