import { nFormatter } from "../../functions";
import { INFINITY_NUMBER } from "../misc";

export type PlanFeature = {
  id?: string;
  text: string;
  tooltip?: {
    title: string;
    cta: string;
    href: string;
  };
};

export type PlanDetails = {
  name: string;
  price: {
    monthly: number | null;
    yearly: number | null;
    ids?: string[];
  };
  limits: {
    links: number;
    clicks: number;
    payouts: number;
    domains: number;
    tags: number;
    folders: number;
    groups: number;
    networkInvites: number;
    users: number;
    ai: number;
    api: number;
    analyticsApi: number;
    retention: string;
  };
  tiers?: {
    [key: number]: {
      price: {
        monthly: number | null;
        yearly: number | null;
        ids: string[];
      };
      limits: {
        links: number;
        clicks: number;
      };
    };
  };
  featureTitle?: string;
  features?: PlanFeature[];
};

const LEGACY_PRO_PRICE_IDS = [
  "price_1LodNLAlJJEpqkPVQSrt33Lc", // old monthly
  "price_1LodNLAlJJEpqkPVRxUyCQgZ", // old yearly
  "price_1OTcQBAlJJEpqkPViGtGEsbb", // new monthly (test)
  "price_1OYJeBAlJJEpqkPVLjTsjX0E", // new monthly (prod)
  "price_1OTcQBAlJJEpqkPVYlCMqdLL", // new yearly (test)
  "price_1OYJeBAlJJEpqkPVnPGEZeb0", // new yearly (prod)
];

const PRO_TIER_PRICE_IDS = {
  2: [
    "price_1SQtg3AlJJEpqkPVVhDSyd9u", // yearly (prod)
    "price_1SQtg3AlJJEpqkPVNHYhTRy7", // monthly (prod)
    "price_1SQ8hiAlJJEpqkPVIy8pfvAC", // yearly (test)
    "price_1SQ8gwAlJJEpqkPVb78Oc9Yc", // monthly (test)
  ],
};

// 2025 pricing
const NEW_PRO_PRICE_IDS = [
  "price_1R8XtyAlJJEpqkPV5WZ4c0jF", //  yearly
  "price_1R8XtEAlJJEpqkPV4opVvVPq", // monthly
  "price_1R8XxZAlJJEpqkPVqGi0wOqD", // yearly (test),
  "price_1R7oeBAlJJEpqkPVh6q5q3h8", // monthly (test),
  ...Object.values(PRO_TIER_PRICE_IDS).flat(),
];

const LEGACY_BUSINESS_PRICE_IDS = [
  "price_1LodLoAlJJEpqkPV9rD0rlNL", // old monthly
  "price_1LodLoAlJJEpqkPVJdwv5zrG", // oldest yearly
  "price_1OZgmnAlJJEpqkPVOj4kV64R", // old yearly
  "price_1OzNlmAlJJEpqkPV7s9HXNAC", // new monthly (test)
  "price_1OzNmXAlJJEpqkPVYO89lTdx", // new yearly (test)
  "price_1OzOFIAlJJEpqkPVJxzc9irl", // new monthly (prod)
  "price_1OzOXMAlJJEpqkPV9ERrjjbw", // new yearly (prod)
];

const BUSINESS_TIER_PRICE_IDS = {
  2: [
    "price_1SQtdxAlJJEpqkPV4kNkRHZr", // yearly (prod)
    "price_1SQtdxAlJJEpqkPV7cvJTv4g", // monthly (prod)
    "price_1SQ8iwAlJJEpqkPVEGmKd6Lg", // yearly (test)
    "price_1SQ8iSAlJJEpqkPVQ5crmBtF", // monthly (test)
  ],
};

// 2025 pricing
export const NEW_BUSINESS_PRICE_IDS = [
  "price_1R3j01AlJJEpqkPVXuG1eNzm", //  yearly
  "price_1R6JedAlJJEpqkPVMUkfjch4", // monthly
  "price_1R8XypAlJJEpqkPVdjzOcYUC", // yearly (test),
  "price_1R7ofLAlJJEpqkPV3MlgDpyx", // monthly (test),
  ...Object.values(BUSINESS_TIER_PRICE_IDS).flat(),
];

const ADVANCED_TIER_PRICE_IDS = {
  2: [
    "price_1SQtg6AlJJEpqkPVAJdrStq7", // yearly (prod)
    "price_1SQtg6AlJJEpqkPVaZNisQdm", // monthly (prod)
    "price_1SQ8jlAlJJEpqkPV6EanvSXl", // yearly (test)
    "price_1SQ8jJAlJJEpqkPVIwY9QZSP", // monthly (test)
  ],
  3: [
    "price_1SQtg8AlJJEpqkPVvQVU7uQ3", // yearly (prod)
    "price_1SQtg8AlJJEpqkPV4Nks8MkS", // monthly (prod)
    "price_1SQ8lqAlJJEpqkPVzBaioV3I", // yearly (test)
    "price_1SQ8lOAlJJEpqkPVz2R8SRss", // monthly (test)
  ],
};

const ADVANCED_PRICE_IDS = [
  "price_1R8Xw4AlJJEpqkPV6nwdink9", //  yearly
  "price_1R3j0qAlJJEpqkPVkfGNXRwb", // monthly
  "price_1R8XztAlJJEpqkPVnHmIU2tf", // yearly (test),
  "price_1R7ofzAlJJEpqkPV0L2TwyJo", // monthly (test),
  ...Object.values(ADVANCED_TIER_PRICE_IDS).flat(),
];

export const PLANS: PlanDetails[] = [
  {
    name: "Free",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      links: 25,
      clicks: 1_000,
      payouts: 0,
      domains: 3,
      tags: 5,
      folders: 0,
      groups: 0,
      networkInvites: 0,
      users: 1,
      ai: 10,
      api: 60,
      analyticsApi: 0, // analytics API is not available on the Free plan
      retention: "30-day",
    },
  },
  {
    name: "Pro",
    price: {
      monthly: 30,
      yearly: 25,
      ids: [...LEGACY_PRO_PRICE_IDS, ...NEW_PRO_PRICE_IDS],
    },
    limits: {
      links: 1_000,
      clicks: 50_000,
      payouts: 0,
      domains: 10,
      tags: 25,
      folders: 3,
      groups: 0,
      networkInvites: 0,
      users: 3,
      ai: 1_000,
      api: 600,
      analyticsApi: 2,
      retention: "1-year",
    },
    tiers: {
      2: {
        price: {
          monthly: 60,
          yearly: 50,
          ids: PRO_TIER_PRICE_IDS[2],
        },
        limits: {
          links: 5_000,
          clicks: 150_000,
        },
      },
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { id: "clicks", text: "50K tracked clicks/mo" },
      { id: "links", text: "1K new links/mo" },
      { id: "retention", text: "1-year analytics retention" },
      { id: "domains", text: "10 domains" },
      { id: "users", text: "3 users" },
      {
        id: "advanced",
        text: "Advanced link features",
        tooltip: "ADVANCED_LINK_FEATURES",
      },
      {
        id: "ai",
        text: "Unlimited AI credits",
        tooltip: {
          title:
            "Subject to fair use policy – you will be notified if you exceed the limit, which are high enough for frequent usage.",
          cta: "Learn more.",
          href: "https://dub.co/blog/introducing-dub-ai",
        },
      },
      {
        id: "dotlink",
        text: "Free .link domain",
        tooltip: {
          title:
            "All our paid plans come with a free .link custom domain, which helps improve click-through rates.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/free-dot-link-domain",
        },
      },
      {
        id: "folders",
        text: "Link folders",
        tooltip: {
          title:
            "Organize and manage access to your links on Dub using folders.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/link-folders",
        },
      },
      {
        id: "deeplinks",
        text: "Deep links",
        tooltip: {
          title:
            "Redirect users to a specific page within your mobile application using deep links.",
          cta: "Learn more.",
          href: "https://dub.co/docs/concepts/deep-links/quickstart",
        },
      },
    ] as PlanFeature[],
  },
  {
    name: "Business",
    price: {
      monthly: 90,
      yearly: 75,
      ids: [...LEGACY_BUSINESS_PRICE_IDS, ...NEW_BUSINESS_PRICE_IDS],
    },
    limits: {
      links: 10_000,
      clicks: 250_000,
      payouts: 2_500_00,
      domains: 100,
      tags: INFINITY_NUMBER,
      folders: 20,
      groups: 3,
      networkInvites: 0,
      users: 10,
      ai: 1_000,
      api: 1_200,
      analyticsApi: 4,
      retention: "3-year",
    },
    tiers: {
      2: {
        price: {
          monthly: 180,
          yearly: 150,
          ids: BUSINESS_TIER_PRICE_IDS[2],
        },
        limits: {
          links: 25_000,
          clicks: 600_000,
        },
      },
    },
    featureTitle: "Everything in Pro, plus:",
    features: [
      {
        id: "clicks",
        text: "250K tracked clicks/mo",
      },
      {
        id: "links",
        text: "10K new links/mo",
      },
      {
        id: "retention",
        text: "3-year analytics retention",
      },
      {
        id: "payouts",
        text: "$2.5K partner payouts/mo",
        tooltip: {
          title:
            "Send payouts to your partners with 1-click (or automate it completely) – all across the world.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
        },
      },
      {
        id: "users",
        text: "10 users",
      },
      {
        id: "partners",
        text: "Dub Partners",
        tooltip: {
          title: "Use Dub Partners to manage and pay out your affiliates.",
          cta: "Learn more.",
          href: "https://dub.co/partners",
        },
      },
      {
        id: "customerinsights",
        text: "Customer insights",
        tooltip: {
          title:
            "Get real-time insights into your customers' behavior and preferences.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/customer-insights",
        },
      },
      {
        id: "events",
        text: "Real-time events stream",
        tooltip: {
          title:
            "Get more data on your link clicks and QR code scans with a detailed, real-time stream of events in your workspace",
          cta: "Learn more.",
          href: "https://dub.co/help/article/real-time-events-stream",
        },
      },
      {
        id: "webhooks",
        text: "Event webhooks",
        tooltip: {
          title:
            "Get real-time notifications when a link is clicked or a QR code is scanned using webhooks.",
          cta: "Learn more.",
          href: "https://dub.co/docs/concepts/webhooks/introduction",
        },
      },
      {
        id: "tests",
        text: "A/B testing",
      },
    ] as PlanFeature[],
  },
  {
    name: "Advanced",
    price: {
      monthly: 300,
      yearly: 250,
      ids: ADVANCED_PRICE_IDS,
    },
    limits: {
      links: 50_000,
      clicks: 1_000_000,
      payouts: 15_000_00,
      domains: 250,
      tags: INFINITY_NUMBER,
      folders: 50,
      groups: 10,
      networkInvites: 0,
      users: 20,
      ai: 1_000,
      api: 3_000,
      analyticsApi: 8,
      retention: "5-year",
    },
    tiers: {
      2: {
        price: {
          monthly: 600,
          yearly: 500,
          ids: ADVANCED_TIER_PRICE_IDS[2],
        },
        limits: {
          links: 150_000,
          clicks: 2_000_000,
        },
      },
      3: {
        price: {
          monthly: 900,
          yearly: 750,
          ids: ADVANCED_TIER_PRICE_IDS[3],
        },
        limits: {
          links: 300_000,
          clicks: 3_500_000,
        },
      },
    },
    featureTitle: "Everything in Business, plus:",
    features: [
      {
        id: "clicks",
        text: "1M tracked clicks/mo",
      },
      {
        id: "links",
        text: "50K new links/mo",
      },
      {
        id: "retention",
        text: "5-year analytics retention",
      },
      {
        id: "payouts",
        text: "$15K partner payouts/mo",
        tooltip: {
          title:
            "Send payouts to your partners with 1-click (or automate it completely) – all across the world.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
        },
      },
      {
        id: "users",
        text: "20 users",
      },
      {
        id: "flexiblerewards",
        text: "Advanced reward structures",
        tooltip: {
          title:
            "Create dynamic click, lead, or sale-based rewards with country and product-specific modifiers.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-rewards",
        },
      },
      {
        id: "embeddedreferrals",
        text: "Embedded referral dashboard",
        tooltip: {
          title:
            "Create an embedded referral dashboard directly in your app in just a few lines of code.",
          cta: "Learn more.",
          href: "https://dub.co/docs/partners/embedded-referrals",
        },
      },
      {
        id: "messages",
        text: "Messaging center",
        tooltip: {
          title:
            "Easily communicate with your partners using our messaging center.",
        },
      },
      {
        id: "email",
        text: "Email campaigns",
        tooltip: {
          title:
            "Send marketing and transactional emails to your partners to increase engagement and drive conversions.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/email-campaigns",
        },
      },
      {
        id: "slack",
        text: "Priority Slack support",
      },
    ] as PlanFeature[],
  },
  {
    name: "Enterprise",
    price: {
      monthly: null,
      yearly: null,
    },
    limits: {
      links: 500_000,
      clicks: 5_000_000,
      payouts: INFINITY_NUMBER,
      domains: 250,
      tags: INFINITY_NUMBER,
      folders: INFINITY_NUMBER,
      groups: INFINITY_NUMBER,
      networkInvites: 20,
      users: 30,
      ai: 1_000,
      api: 3_000,
      analyticsApi: 16,
      retention: "Unlimited",
    },
  },
];

export const FREE_PLAN = PLANS.find((plan) => plan.name === "Free")!;
export const PRO_PLAN = PLANS.find((plan) => plan.name === "Pro")!;
export const BUSINESS_PLAN = PLANS.find((plan) => plan.name === "Business")!;
export const ADVANCED_PLAN = PLANS.find((plan) => plan.name === "Advanced")!;
export const ENTERPRISE_PLAN = PLANS.find(
  (plan) => plan.name === "Enterprise",
)!;

export const SELF_SERVE_PAID_PLANS = PLANS.filter((p) =>
  ["Pro", "Business", "Advanced"].includes(p.name),
);

export const FREE_WORKSPACES_LIMIT = 2;

const enrichPlanWithTierData = (
  planDetails: PlanDetails,
  planTier: number,
): PlanDetails => {
  const tierData =
    planDetails.tiers && planTier > 1 ? planDetails.tiers[planTier] : undefined;
  const tierLimits = tierData?.limits ?? planDetails.limits;

  return {
    ...planDetails,
    limits: {
      ...planDetails.limits,
      ...tierLimits,
    },
    price: {
      ...planDetails.price,
      ...tierData?.price,
    },
    features: planDetails.features?.map((feature) => ({
      ...feature,
      text:
        feature.id === "clicks"
          ? `${nFormatter(tierLimits.clicks)} tracked clicks/mo`
          : feature.id === "links"
            ? `${nFormatter(tierLimits.links)} new links/mo`
            : feature.text,
    })),
  };
};

export const getPlanAndTierFromPriceId = ({
  priceId,
}: {
  priceId: string;
}): { plan: PlanDetails | null; planTier: number } => {
  const planDetails = PLANS.find((plan) => plan.price.ids?.includes(priceId));
  if (!planDetails) return { plan: null, planTier: 1 };

  const planTier = planDetails.tiers
    ? Number(
        Object.entries(planDetails.tiers).find(([_, { price }]) =>
          price.ids.includes(priceId),
        )?.[0],
      ) || 1
    : 1;

  return {
    plan: enrichPlanWithTierData(planDetails, planTier),
    planTier,
  };
};

export const getPlanDetails = ({
  plan,
  planTier = 1,
}: {
  plan: string;
  planTier?: number;
}) => {
  const planDetails = PLANS.find(
    (p) => p.name.toLowerCase() === plan.toLowerCase(),
  )!;

  return enrichPlanWithTierData(planDetails, planTier);
};

export const getNextPlan = (plan?: string | null) => {
  if (!plan) return PRO_PLAN;
  const currentPlan = plan.toLowerCase().split(" ")[0]; // to account for old Business plans (e.g. "Business Plus")
  return PLANS[
    Math.min(
      // returns the next plan, or the last plan if the current plan is the last plan
      PLANS.findIndex((p) => p.name.toLowerCase() === currentPlan) + 1,
      PLANS.length - 1,
    )
  ];
};

export const isDowngradePlan = ({
  currentPlan,
  newPlan,
  currentTier,
  newTier,
}: {
  currentPlan: string;
  newPlan: string;
  currentTier?: number;
  newTier?: number;
}) => {
  const currentPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === currentPlan.toLowerCase(),
  );
  const newPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === newPlan.toLowerCase(),
  );
  return (
    currentPlanIndex > newPlanIndex ||
    (currentPlanIndex === newPlanIndex && (currentTier ?? 1) > (newTier ?? 1))
  );
};

export const getSuggestedPlan = ({
  events,
  links,
  suggestFree = false,
}: {
  events?: number;
  links?: number;
  suggestFree?: boolean;
}): { plan: PlanDetails; planTier: number } => {
  let match: { plan: PlanDetails; planTier: number } | null = null;

  for (const p of PLANS) {
    if (!suggestFree && p.price.monthly === 0) continue;

    const matchingTier = [
      1,
      ...Object.keys(p.tiers ?? {})
        .map(Number)
        .filter((tier) => tier >= 2),
    ].find((tier) => {
      const limits =
        tier === 1 ? p.limits : p.tiers?.[tier]?.limits ?? p.limits;
      return limits.clicks >= (events ?? 0) && limits.links >= (links ?? 0);
    });

    if (matchingTier !== undefined) {
      match = {
        plan: enrichPlanWithTierData(p, matchingTier),
        planTier: matchingTier,
      };

      break;
    }
  }

  return match ?? { plan: ENTERPRISE_PLAN, planTier: 1 };
};

export const isLegacyBusinessPlan = ({
  plan = "business",
  payoutsLimit = 0,
}: {
  plan?: string;
  payoutsLimit?: number;
}) => plan === "business" && payoutsLimit === 0;
