import { PartnerPayoutMethod } from "@dub/prisma/client";
import {
  CONNECT_SUPPORTED_COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  STABLECOIN_SUPPORTED_COUNTRIES,
} from "@dub/utils";

export function getPayoutMethodsForCountry(country: string | null | undefined) {
  if (!country) {
    return [];
  }

  const methods: PartnerPayoutMethod[] = [];

  if (CONNECT_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("connect");
  }

  if (STABLECOIN_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("stablecoin");
  }

  if (PAYPAL_SUPPORTED_COUNTRIES.includes(country)) {
    methods.push("paypal");
  }

  return methods;
}
