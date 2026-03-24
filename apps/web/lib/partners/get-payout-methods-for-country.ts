import { PartnerPayoutMethod } from "@dub/prisma/client";
import {
  CONNECT_SUPPORTED_COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  STABLECOIN_SUPPORTED_COUNTRIES,
} from "@dub/utils";

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
