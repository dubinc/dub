import {
  CONNECT_SUPPORTED_COUNTRIES,
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { CountryGrid } from "./country-grid";

export function PayoutSupportedCountries() {
  const supportedCountries = [
    ...CONNECT_SUPPORTED_COUNTRIES,
    ...PAYPAL_SUPPORTED_COUNTRIES,
  ];
  const sortedCountries = supportedCountries.sort((a, b) =>
    COUNTRIES[a].localeCompare(COUNTRIES[b]),
  );
  return <CountryGrid countries={sortedCountries} />;
}

export default function SupportedCountriesEmbed() {
  return <PayoutSupportedCountries />;
}
