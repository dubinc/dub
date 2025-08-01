import { fraudEventTypeSchema } from "@/lib/zod/schemas/fraud-events";
import { z } from "zod";
import { isDisposableEmail } from "./is-disposable-email";
import { isGoogleAdsClick } from "./is-google-ads-click";
import { isSelfReferral } from "./is-self-referral";

type FraudEvent = {
  type: z.infer<typeof fraudEventTypeSchema>;
  reason: string | null;
};

export const detectFraudEvents = async ({
  click,
  customer,
  partner,
}: {
  click: {
    url: string;
    ip?: string | null;
  };
  customer: {
    email: string;
    name: string;
  };
  partner: {
    email: string;
    name: string;
    ipAddress?: string | null;
  };
}) => {
  const { selfReferral, reasons } = await isSelfReferral({
    partner,
    customer,
    click,
  });

  const events: FraudEvent[] = [];

  if (selfReferral) {
    events.push({
      type: "selfReferral",
      reason: reasons.join(", "),
    });
  }

  if (isGoogleAdsClick(click.url)) {
    events.push({
      type: "googleAdsClick",
      reason: null,
    });
  }

  if (customer.email && (await isDisposableEmail(customer.email))) {
    events.push({
      type: "disposableEmail",
      reason: null,
    });
  }

  return events;
};
