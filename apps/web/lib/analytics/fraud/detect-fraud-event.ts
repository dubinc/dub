import { FraudEventType } from "@dub/prisma/client";
import { isDisposableEmail } from "./is-disposable-email";
import { isGoogleAdsClick } from "./is-google-ads-click";
import { isSelfReferral } from "./is-self-referral";

type FraudEventResult =
  | {
      type: FraudEventType;
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
  const { selfReferral } = await isSelfReferral({
    partner,
    customer,
    click,
  });

  if (selfReferral) {
    return {
      type: FraudEventType.selfReferral,
    };
  }

  if (isGoogleAdsClick(click.url)) {
    return {
      type: FraudEventType.googleAdsClick,
    };
  }

  if (customer.email && (await isDisposableEmail(customer.email))) {
    return {
      type: FraudEventType.disposableEmail,
    };
  }
};
