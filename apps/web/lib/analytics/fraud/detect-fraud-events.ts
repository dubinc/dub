import { ClickEventTB, CustomerProps, PartnerProps } from "@/lib/types";
import { fraudEventTypeSchema } from "@/lib/zod/schemas/fraud-events";
import { z } from "zod";
import { isDisposableEmail } from "./is-disposable-email";
import { isGoogleAdsClick } from "./is-google-ads-click";
import { isSelfReferral } from "./is-self-referral";

interface FraudEvent {
  type: z.infer<typeof fraudEventTypeSchema>;
  reasons?: string[] | null;
  parameters?: Record<string, string> | null;
}

export const detectFraudEvents = async ({
  click,
  customer,
  partner,
}: {
  partner: Pick<PartnerProps, "name" | "email"> & {
    ipAddress: string | null;
  };
  customer: Pick<CustomerProps, "name" | "email">;
  click: Pick<ClickEventTB, "url" | "ip" | "referer">;
}) => {
  const { selfReferral, reasons } = isSelfReferral({
    partner,
    customer,
    click,
  });

  const events: FraudEvent[] = [];

  if (selfReferral) {
    events.push({
      type: "selfReferral",
      reasons,
    });
  }

  const { googleAdsClick, parameters } = isGoogleAdsClick({
    url: click.url,
    referer: click.referer,
  });

  if (googleAdsClick) {
    events.push({
      type: "googleAdsClick",
      parameters,
    });
  }

  if (customer.email && (await isDisposableEmail(customer.email))) {
    events.push({
      type: "disposableEmail",
    });
  }

  return events;
};
