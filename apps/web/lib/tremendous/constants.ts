import { ACME_PROGRAM_ID } from "@dub/utils";

export const TREMENDOUS_ENABLED_PROGRAM_IDS = [
  ACME_PROGRAM_ID,
  "prog_1KPAZMF49X9A1WEWRBM55KZY7", // Upheal
];

export const TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS = 200_000;

// https://api.tremendous.com/prohibited_top_level_domains.txt
export const TREMENDOUS_PROHIBITED_TOP_LEVEL_DOMAINS = [
  ".af",
  ".by",
  ".cu",
  ".ir",
  ".iq",
  ".mm",
  ".kp",
  ".ru",
  ".su",
  ".рф",
  ".sy",
  ".ua",
  ".ve",
  ".ye",
];

// TODO:
// Handle prohibited email domains: https://api.tremendous.com/prohibited_email_domains.txt
