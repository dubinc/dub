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

export const PLANS = [
  {
    name: "Free",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      links: 25,
      clicks: 1000,
      sales: 0,
      domains: 3,
      tags: 5,
      folders: 0,
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
      ids: [
        "price_1LodNLAlJJEpqkPVQSrt33Lc", // old monthly
        "price_1LodNLAlJJEpqkPVRxUyCQgZ", // old yearly
        "price_1OTcQBAlJJEpqkPViGtGEsbb", // new monthly (test)
        "price_1OYJeBAlJJEpqkPVLjTsjX0E", // new monthly (prod)
        "price_1OTcQBAlJJEpqkPVYlCMqdLL", // new yearly (test)
        "price_1OYJeBAlJJEpqkPVnPGEZeb0", // new yearly (prod)

        // 2025 pricing
        "price_1R8XtyAlJJEpqkPV5WZ4c0jF", //  yearly
        "price_1R8XtEAlJJEpqkPV4opVvVPq", // monthly
        "price_1R8XxZAlJJEpqkPVqGi0wOqD", // yearly (test),
        "price_1R7oeBAlJJEpqkPVh6q5q3h8", // monthly (test),
      ],
    },
    limits: {
      links: 1_000,
      clicks: 50_000,
      sales: 0,
      domains: 10,
      tags: 25,
      folders: 3,
      users: 3,
      ai: 1000,
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
      },
      {
        id: "deeplinks",
        text: "Deep links",
        tooltip: {
          title:
            "Redirect users to a specific page within your mobile application using deep links.",
          cta: "Learn more.",
          href: "https://dub.co//help/article/custom-domain-deep-links",
        },
      },
    ] as PlanFeature[],
  },
  {
    name: "Business",
    price: {
      monthly: 90,
      yearly: 75,
      ids: [
        "price_1LodLoAlJJEpqkPV9rD0rlNL", // old monthly
        "price_1LodLoAlJJEpqkPVJdwv5zrG", // oldest yearly
        "price_1OZgmnAlJJEpqkPVOj4kV64R", // old yearly
        "price_1OzNlmAlJJEpqkPV7s9HXNAC", // new monthly (test)
        "price_1OzNmXAlJJEpqkPVYO89lTdx", // new yearly (test)
        "price_1OzOFIAlJJEpqkPVJxzc9irl", // new monthly (prod)
        "price_1OzOXMAlJJEpqkPV9ERrjjbw", // new yearly (prod)

        // 2025 pricing
        "price_1R3j01AlJJEpqkPVXuG1eNzm", //  yearly
        "price_1R6JedAlJJEpqkPVMUkfjch4", // monthly
        "price_1R8XypAlJJEpqkPVdjzOcYUC", // yearly (test),
        "price_1R7ofLAlJJEpqkPV3MlgDpyx", // monthly (test),
      ],
    },
    limits: {
      links: 10_000,
      clicks: 250_000,
      sales: 25_000_00,
      domains: 100,
      tags: INFINITY_NUMBER,
      folders: 20,
      users: 10,
      ai: 1000,
      api: 3000,
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
        id: "sales",
        text: "$25K tracked sales/mo",
        tooltip: {
          title:
            "Use Dub Conversions to track how your link clicks are converting to signups and sales. Limits are based on the total sale amount tracked within a given month.",
          cta: "Learn more.",
          href: "https://d.to/conversions",
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
        id: "payouts",
        text: "1-click global payouts",
        tooltip: {
          title: "Send payouts to 180+ countries in 1-click.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
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
      ids: [
        // 2025 pricing
        "price_1R8Xw4AlJJEpqkPV6nwdink9", //  yearly
        "price_1R3j0qAlJJEpqkPVkfGNXRwb", // monthly
        "price_1R8XztAlJJEpqkPVnHmIU2tf", // yearly (test),
        "price_1R7ofzAlJJEpqkPV0L2TwyJo", // monthly (test),
      ],
    },
    limits: {
      links: 50_000,
      clicks: 1_000_000,
      sales: 100_000_00,
      domains: 250,
      tags: INFINITY_NUMBER,
      folders: 50,
      users: 20,
      ai: 1000,
      api: 3000,
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
        id: "sales",
        text: "$100K tracked sales/mo",
        tooltip: {
          title:
            "Use Dub Conversions to track how your link clicks are converting to signups and sales. Limits are based on the total sale amount tracked within a given month.",
          cta: "Learn more.",
          href: "https://d.to/conversions",
        },
      },
      {
        id: "users",
        text: "20 users",
      },
      {
        id: "roles",
        text: "Folders RBAC",
      },
      {
        id: "whitelabel",
        text: "White-labeling support",
      },
      {
        id: "volume",
        text: "Lower payout fees",
        tooltip: {
          title: "Lower fees associated with Partner payouts.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
        },
      },
      {
        id: "email",
        text: "Branded email domains",
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
      links: 250000,
      clicks: 5000000,
      sales: 1000000_00,
      domains: 1000,
      tags: INFINITY_NUMBER,
      folders: INFINITY_NUMBER,
      users: 500,
      ai: 10000,
      api: 10000,
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
  return PLANS[
    PLANS.findIndex((p) => p.name.toLowerCase() === plan.toLowerCase()) + 1
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
