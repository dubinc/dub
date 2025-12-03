export const PROGRAM_ONBOARDING_PARTNERS_LIMIT = 5;
export const MAX_PROGRAM_CATEGORIES = 3;
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
