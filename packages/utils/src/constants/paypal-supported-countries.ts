import { CONNECT_SUPPORTED_COUNTRIES } from "./connect-supported-countries";

// @see: https://developer.paypal.com/docs/payouts/standard/reference/country-feature
export const PAYPAL_SUPPORTED_COUNTRIES_FULL = [
  "AD", // Andorra
  "AR", // Argentina
  "AU", // Australia
  "AT", // Austria
  "BS", // Bahamas
  "BH", // Bahrain
  "BE", // Belgium
  "BM", // Bermuda
  "BW", // Botswana
  "BR", // Brazil
  "BG", // Bulgaria
  "CA", // Canada
  "KY", // Cayman Islands
  "CL", // Chile
  "CN", // China
  "CO", // Colombia
  "CR", // Costa Rica
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "DO", // Dominican Republic
  "EC", // Ecuador
  "SV", // El Salvador
  "EE", // Estonia
  "FO", // Faroe Islands
  "FI", // Finland
  "FR", // France
  "GE", // Georgia
  "DE", // Germany
  "GI", // Gibraltar
  "GR", // Greece
  "GL", // Greenland
  "GT", // Guatemala
  "HN", // Honduras
  "HK", // Hong Kong SAR China
  "HU", // Hungary
  "IS", // Iceland
  "IN", // India
  "ID", // Indonesia
  "IE", // Ireland
  "IL", // Israel
  "IT", // Italy
  "JM", // Jamaica
  "JP", // Japan
  "JO", // Jordan
  "KZ", // Kazakhstan
  "KE", // Kenya
  "KW", // Kuwait
  "LV", // Latvia
  "LS", // Lesotho
  "LI", // Liechtenstein
  "LT", // Lithuania
  "LU", // Luxembourg
  "MY", // Malaysia
  "MT", // Malta
  "MU", // Mauritius
  "MX", // Mexico
  "MD", // Moldova
  "MC", // Monaco
  "MA", // Morocco
  "MZ", // Mozambique
  "NL", // Netherlands
  "NZ", // New Zealand
  "NI", // Nicaragua
  "NO", // Norway
  "OM", // Oman
  "PA", // Panama
  "PE", // Peru
  "PH", // Philippines
  "PL", // Poland
  "PT", // Portugal
  "QA", // Qatar
  "RE", // Réunion
  "RO", // Romania
  "SM", // San Marino
  "SA", // Saudi Arabia
  "SN", // Senegal
  "RS", // Serbia
  "SG", // Singapore
  "SK", // Slovakia
  "SI", // Slovenia
  "ZA", // South Africa
  "ES", // Spain
  "SE", // Sweden
  "CH", // Switzerland
  "TR", // Turkey
  "AE", // United Arab Emirates
  "GB", // United Kingdom
  "US", // United States
  "UY", // Uruguay
  "VE", // Venezuela
  "VN", // Vietnam
];

// paypal supported countries that are not supported by Stripe
export const PAYPAL_SUPPORTED_COUNTRIES =
  PAYPAL_SUPPORTED_COUNTRIES_FULL.filter(
    (country) => !CONNECT_SUPPORTED_COUNTRIES.includes(country),
  );
