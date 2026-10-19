import {
  CONNECT_SUPPORTED_COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  STABLECOIN_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { PartnerPayoutMethod } from "@prisma/client";

export function getPayoutMethodsForCountry({
  country,
}: {
  country: string | null | undefined;
}) {
  if (!country) {
    return [];
  }

  const methods: PartnerPayoutMethod[] = [];

  if (STABLECOIN_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("stablecoin");
  }

  if (CONNECT_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("connect");
  }

  if (PAYPAL_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("paypal");
  }

  return methods;
}

export function canSelfServePartnerCountryChange({
  from,
  to,
}: {
  from: string | null | undefined;
  to: string;
}) {
  if (!from || from === to || to === "US") {
    return false;
  }

  return (
    getPayoutMethodsForCountry({ country: from }).length > 0 &&
    getPayoutMethodsForCountry({ country: to }).length > 0
  );
}
