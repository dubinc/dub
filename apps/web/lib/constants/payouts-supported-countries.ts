import {
  CONNECT_SUPPORTED_COUNTRIES,
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  STABLECOIN_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { getPayoutMethodsForCountry } from "../partners/get-payout-methods-for-country";

export const PAYOUT_SUPPORTED_COUNTRIES = [
  ...new Set([
    ...STABLECOIN_SUPPORTED_COUNTRIES,
    ...CONNECT_SUPPORTED_COUNTRIES,
    ...PAYPAL_SUPPORTED_COUNTRIES,
  ]),
]
  .sort((a, b) => COUNTRIES[a].localeCompare(COUNTRIES[b]))
  .map((code) => ({
    code,
    name: COUNTRIES[code],
    methods: getPayoutMethodsForCountry({ country: code }),
  }));
