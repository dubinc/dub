import { COUNTRIES } from "./countries";

// @see: https://tremendous.notion.site/Tremendous-Prohibited-Jurisdictions-cbf4040538db4e6d8867a70629526870
const TREMENDOUS_NOT_SUPPORTED_COUNTRIES = [
  "AF", // Afghanistan
  "BY", // Belarus
  "CU", // Cuba
  "IR", // Iran
  "IQ", // Iraq
  "KP", // North Korea
  "RU", // Russia
  "SY", // Syria
  "UA", // Ukraine
  "VE", // Venezuela
  "YE", // Yemen
];

export const TREMENDOUS_SUPPORTED_COUNTRIES = Object.keys(COUNTRIES).filter(
  (country) => !TREMENDOUS_NOT_SUPPORTED_COUNTRIES.includes(country),
);
