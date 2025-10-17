import { INFINITY_NUMBER } from "./misc";

export type PlanFeature = {
  id?: string;
  text: string;
  tooltip?: {
    title: string;
    cta: string;
    href: string;
  };
};

const LEGACY_PRO_PRICE_IDS = [
  "price_1LodNLAlJJEpqkPVQSrt33Lc", // old monthly
  "price_1LodNLAlJJEpqkPVRxUyCQgZ", // old yearly
  "price_1OTcQBAlJJEpqkPViGtGEsbb", // new monthly (test)
  "price_1OYJeBAlJJEpqkPVLjTsjX0E", // new monthly (prod)
  "price_1OTcQBAlJJEpqkPVYlCMqdLL", // new yearly (test)
  "price_1OYJeBAlJJEpqkPVnPGEZeb0", // new yearly (prod)
];

// 2025 pricing
const NEW_PRO_PRICE_IDS = [
  "price_1R8XtyAlJJEpqkPV5WZ4c0jF", //  yearly
  "price_1R8XtEAlJJEpqkPV4opVvVPq", // monthly
  "price_1R8XxZAlJJEpqkPVqGi0wOqD", // yearly (test),
  "price_1R7oeBAlJJEpqkPVh6q5q3h8", // monthly (test),
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

// 2025 pricing
export const NEW_BUSINESS_PRICE_IDS = [
  "price_1R3j01AlJJEpqkPVXuG1eNzm", //  yearly
  "price_1R6JedAlJJEpqkPVMUkfjch4", // monthly
  "price_1R8XypAlJJEpqkPVdjzOcYUC", // yearly (test),
  "price_1R7ofLAlJJEpqkPV3MlgDpyx", // monthly (test),
];

export const PLANS = [
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
      retention: "30-day",
    },
  },
  {
    name: "Pro",
    link: "https://dub.co/help/article/pro-plan",
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
      retention: "1-year",
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
      retention: "3-year",
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
        id: "partners",
        text: "Partner management",
        tooltip: {
          title: "Use Dub Partners to manage and pay out your affiliates.",
          cta: "Learn more.",
          href: "https://dub.co/partners",
        },
      },
      {
        id: "tests",
        text: "A/B testing",
      },
      {
        id: "roles",
        text: "Customer insights",
        tooltip: {
          title:
            "Get real-time insights into your customers' behavior and preferences.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/customer-insights",
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
    ] as PlanFeature[],
  },
  {
    name: "Advanced",
    price: {
      monthly: 300,
      yearly: 250,
      ids: [
        "price_1R8Xw4AlJJEpqkPV6nwdink9", //  yearly
        "price_1R3j0qAlJJEpqkPVkfGNXRwb", // monthly
        "price_1R8XztAlJJEpqkPVnHmIU2tf", // yearly (test),
        "price_1R7ofzAlJJEpqkPV0L2TwyJo", // monthly (test),
      ],
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
      retention: "5-year",
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
        id: "api",
        text: "Partners API",
        tooltip: {
          title:
            "Leverage our partners API to build a bespoke, white-labeled referral program that lives within your app.",
          cta: "Learn more.",
          href: "https://dub.co/docs/api-reference/endpoint/create-a-partner",
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
      retention: "Unlimited",
    },
  },
];

export const FREE_PLAN = PLANS.find((plan) => plan.name === "Free")!;
export const PRO_PLAN = PLANS.find((plan) => plan.name === "Pro")!;
export const BUSINESS_PLAN = PLANS.find((plan) => plan.name === "Business")!;
export const ADVANCED_PLAN = PLANS.find((plan) => plan.name === "Advanced")!;

export const SELF_SERVE_PAID_PLANS = PLANS.filter((p) =>
  ["Pro", "Business", "Advanced"].includes(p.name),
);

export const FREE_WORKSPACES_LIMIT = 2;

export const getPlanFromPriceId = (priceId: string) => {
  return PLANS.find((plan) => plan.price.ids?.includes(priceId)) || null;
};

export const getPlanDetails = (plan: string) => {
  return SELF_SERVE_PAID_PLANS.find(
    (p) => p.name.toLowerCase() === plan.toLowerCase(),
  )!;
};

export const getCurrentPlan = (plan: string) => {
  return (
    PLANS.find((p) => p.name.toLowerCase() === plan.toLowerCase()) || FREE_PLAN
  );
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

export const isDowngradePlan = (currentPlan: string, newPlan: string) => {
  const currentPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === currentPlan.toLowerCase(),
  );
  const newPlanIndex = PLANS.findIndex(
    (p) => p.name.toLowerCase() === newPlan.toLowerCase(),
  );
  return currentPlanIndex > newPlanIndex;
};

export const isLegacyBusinessPlan = ({
  plan = "business",
  payoutsLimit = 0,
}: {
  plan?: string;
  payoutsLimit?: number;
}) => plan === "business" && payoutsLimit === 0;
