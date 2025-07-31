import { FraudEventType } from "@dub/prisma/client";
import { isDisposableEmail } from "./is-disposable-email";
import { isGoogleAdsClick } from "./is-google-ads-click";
import { isSelfReferral } from "./is-self-referral";

type FraudEventResult =
  | {
      type: FraudEventType;
      reason: string | null;
    }
  | undefined;

export const detectFraudEvent = async ({
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
}): Promise<FraudEventResult> => {
  const { selfReferral, reasons } = await isSelfReferral({
    partner,
    customer,
    click,
  });

  if (selfReferral) {
    return {
      type: FraudEventType.selfReferral,
      reason: reasons.join(", "),
    };
  }

  if (isGoogleAdsClick(click.url)) {
    return {
      type: FraudEventType.googleAdsClick,
      reason: null,
    };
  }

  if (customer.email && (await isDisposableEmail(customer.email))) {
    return {
      type: FraudEventType.disposableEmail,
      reason: null,
    };
  }
};
