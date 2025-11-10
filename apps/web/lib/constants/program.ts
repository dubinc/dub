export const PROGRAM_ONBOARDING_PARTNERS_LIMIT = 5;
export const MAX_PROGRAM_CATEGORIES = 3;
export const LARGE_PROGRAM_IDS = [
  "prog_CYCu7IMAapjkRpTnr8F1azjN",
  "prog_1K0QHV7MP3PR05CJSCF5VN93X",
];
export const LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS = 500000; // $5000
export const PROGRAM_SIMILARITY_SCORE_THRESHOLD = 0.3;

export const PROGRAM_IMPORT_SOURCES = [
  {
    id: "rewardful",
    value: "Rewardful",
    image: "https://assets.dub.co/misc/icons/rewardful.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-rewardful",
  },
  {
    id: "tolt",
    value: "Tolt",
    image: "https://assets.dub.co/misc/icons/tolt.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-tolt",
  },
  {
    id: "partnerstack",
    value: "PartnerStack",
    image: "https://assets.dub.co/misc/icons/partnerstack.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-partnerstack",
  },
  {
    id: "firstpromoter",
    value: "FirstPromoter",
    image: "https://assets.dub.co/misc/icons/firstpromoter.svg",
    helpUrl: "https://dub.co/help/article/migrating-from-firstpromoter",
  },
] as const;
