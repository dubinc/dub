import { ReactNode } from "react";
import { nFormatter } from "../functions";
import { INFINITY_NUMBER } from "./misc";

export type PlanFeature = {
  id?: string;
  text: string;
  footnote?: {
    title: string;
    cta: string;
    href: string;
  };
};

export const PLANS = [
  {
    name: "Free",
    tagline: "For hobbyists and individuals looking to manage their links",
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
    },
    cta: {
      text: "Start for free",
      shorText: "Get started",
      href: "https://app.dub.co/register",
      color:
        "bg-white hover:bg-neutral-50 border border-neutral-200 hover:ring-neutral-100 text-neutral-800",
    },
    featureTitle: "What's included:",
    features: [
      {
        id: "clicks",
        text: "1K tracked clicks/mo",
      },
      { id: "links", text: "25 new links/mo" },
      { id: "retention", text: "30-day analytics retention" },
      { id: "domains", text: "3 domains" },
      { id: "user", text: "1 user" },
      {
        id: "analytics",
        text: "Advanced analytics",
        footnote: {
          title:
            "Get location (country, city, continent), device (type, browser, OS), and referer data on your clicks.",
          cta: "Learn more.",
          href: "https://dub.co/analytics",
        },
      },
      { id: "ai", text: "10 AI credits/mo" },
      { id: "basic-support", text: "Basic support" },
      {
        id: "api",
        text: "API Access",
        footnote: {
          title: "Programatically manage your links using our REST API.",
          cta: "Learn more.",
          href: "https://dub.co/docs/api-reference/introduction",
        },
      },
    ] as PlanFeature[],
  },
  {
    name: "Pro",
    tagline: "For content creators or small teams needing advanced features",
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
        "price_1R6Je3AlJJEpqkPVAXiF4nP5", //  yearly
        "price_1R6JeDAlJJEpqkPV2W1gOwpS", // monthly
      ],
    },
    limits: {
      links: 2_000,
      clicks: 50_000,
      sales: 0,
      domains: 10,
      tags: 25,
      folders: 3,
      users: 3,
      ai: 1000,
      api: 600,
    },
    features: [
      { id: "clicks", text: "50K tracked clicks/mo" },
      { id: "links", text: "2,000 new links/mo" },
      { id: "retention", text: "1-year analytics retention" },
      { id: "domains", text: "10 domains" },
      { id: "users", text: "3 users" },
      {
        id: "link-features",
        text: "Advanced link features",
        footnote:
          "Custom social media cards, password-protected links, link expiration, link cloaking, device targeting, geo targeting etc.",
      },
      {
        id: "ai",
        text: "Unlimited AI credits",
        footnote: {
          title:
            "Subject to fair use policy – you will be notified if you exceed the limit, which are high enough for frequent usage.",
          cta: "Learn more.",
          href: "https://dub.co/blog/introducing-dub-ai",
        },
      },
      { id: "priority-support", text: "Priority support" },
      {
        id: "dotlink",
        text: "Free custom domain",
        footnote: {
          title:
            "All our paid plans come with a free .link custom domain, which helps improve click-through rates.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/free-dot-link-domain",
        },
      },
    ] as PlanFeature[],
  },
  {
    name: "Business",
    tagline: "For fast-growing startups and businesses looking to scale",
    link: "https://dub.co/help/article/business-plan",
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
        id: "sales",
        text: "$25K tracked sales/mo",
        footnote: {
          title:
            "Use Dub Conversions to track how your link clicks are converting to signups and sales. Limits are based on the total sale amount tracked within a given month.",
          cta: "Learn more.",
          href: "https://d.to/conversions",
        },
      },
      {
        id: "retention",
        text: "3-year analytics retention",
      },
      {
        id: "domains",
        text: "100 domains",
      },
      {
        id: "users",
        text: "10 users",
      },
      {
        id: "events",
        text: "Real-time events stream",
        footnote: {
          title:
            "Get more data on your link clicks and QR code scans with a detailed, real-time stream of events in your workspace",
          cta: "Learn more.",
          href: "https://d.to/events",
        },
      },
      {
        id: "webhooks",
        text: "Real-time webhooks",
        footnote: {
          title:
            "Use webhooks to connect Dub with your data stack and workflows – with native integrations for Segment, Zapier, Slack, and more.",
          cta: "Learn more.",
          href: "https://d.to/webhooks",
        },
      },
    ] as PlanFeature[],
  },
  {
    name: "Advanced",
    tagline: "For power users needing more usage quotas",
    link: "https://dub.co/help/article/advanced-plan",
    price: {
      monthly: 300,
      yearly: 250,
      ids: [
        // 2025 pricing
        "price_1R3j0QAlJJEpqkPVrTW1Ss2i", //  yearly
        "price_1R3j0qAlJJEpqkPVkfGNXRwb", // monthly
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
        id: "sales",
        text: "$100K tracked sales/mo",
        footnote: {
          title:
            "Use Dub Conversions to track how your link clicks are converting to signups and sales. Limits are based on the total sale amount tracked within a given month.",
          cta: "Learn more.",
          href: "https://d.to/conversions",
        },
      },
      {
        id: "retention",
        text: "5-year analytics retention",
      },
      {
        id: "domains",
        text: "250 domains",
      },
      {
        id: "users",
        text: "20 users",
      },
    ] as PlanFeature[],
  },
  {
    name: "Enterprise",
    tagline: "For large organizations and governments with custom needs",
    link: "https://dub.co/enterprise",
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
    },
    featureTitle: "Everything in Advanced, plus:",
    features: [
      { id: "sso", text: "SSO/SAML" },
      { id: "roles", text: "Role-based controls" },
      { id: "volume", text: "Volume discounts" },
      { id: "sla", text: "Custom SLA" },
      { id: "logs", text: "Audit logs" },
      { id: "success", text: "Dedicated success manager" },
    ] as PlanFeature[],
  },
];

export const PLAN_COMPARE_FEATURES: {
  category: string;
  features: {
    text: (d: { id: string; plan: (typeof PLANS)[number] }) => ReactNode;
    check?:
      | boolean
      | {
          default?: boolean;
          free?: boolean;
          pro?: boolean;
          business?: boolean;
          advanced?: boolean;
          enterprise?: boolean;
        };
  }[];
}[] = [
  {
    category: "Short links",
    features: [
      {
        text: () => (
          <>
            <strong>Unlimited</strong> clicks
          </>
        ),
      },
      {
        text: ({ plan }) => (
          <>
            <strong>{nFormatter(plan.limits.links)}</strong> new links/mo
          </>
        ),
      },
      {
        text: () => (
          <>
            <strong>Unlimited</strong> redirects
          </>
        ),
      },
      {
        text: () => <>QR Codes</>,
      },
      {
        text: () => <>UTM Builder</>,
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Custom link previews</>,
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Link cloaking</>,
      },

      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Link expiration</>,
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Password protection</>,
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Device targeting</>,
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: () => <>Geo targeting</>,
      },
    ],
  },
  {
    category: "Domains",
    features: [
      {
        text: ({ plan }) => (
          <>
            <strong>{nFormatter(plan.limits.domains, { full: true })}</strong>{" "}
            custom domains
          </>
        ),
      },
      {
        text: () => <>SSL certificates</>,
      },
      {
        check: {
          default: true,
          free: false,
        },
        text: () => (
          <>
            Premium <strong>dub.link</strong> domain
          </>
        ),
      },
      {
        check: {
          default: true,
          free: false,
        },
        text: () => (
          <>
            Free <strong>.link</strong> domain
          </>
        ),
      },
    ],
  },
  {
    category: "Analytics",
    features: [
      {
        text: ({ id }) => (
          <>
            <strong>
              {
                {
                  free: "30 day",
                  pro: "1 year",
                  business: "3 year",
                  advanced: "5 year",
                  enterprise: "Unlimited",
                }[id]
              }
            </strong>{" "}
            retention
          </>
        ),
      },
      {
        text: () => <>Advanced analytics</>,
      },
      {
        text: ({ plan }) => (
          <>
            <strong>{nFormatter(plan.limits.clicks)}</strong> tracked clicks/mo
          </>
        ),
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: () => (
          <>
            <strong>Real-time</strong> events stream
          </>
        ),
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: () => <>Conversion tracking</>,
      },
    ],
  },
  {
    category: "Workspace",
    features: [
      {
        text: ({ plan }) => (
          <>
            <strong>{nFormatter(plan.limits.users)}</strong> user
            {plan.limits.users === 1 ? "" : "s"}
          </>
        ),
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: () => <>SSO/SAML</>,
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: () => <>Custom SLA</>,
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: () => <>Audit logs</>,
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: () => <>Role-based controls</>,
      },
    ],
  },
  {
    category: "Support",
    features: [
      {
        text: ({ id }) => (
          <>
            <strong>
              {{
                free: "Basic",
                pro: "Elevated",
              }[id] ?? "Priority"}
            </strong>{" "}
            {id === "enterprise" ? "with SLA" : "support"}
          </>
        ),
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: () => (
          <>
            <strong>Dedicated</strong> success manager
          </>
        ),
      },
    ],
  },
  {
    category: "API",
    features: [
      {
        text: () => <>API access</>,
      },
      {
        text: ({ id, plan }) => (
          <>
            <strong>
              {id === "enterprise"
                ? "Custom"
                : nFormatter(plan.limits.api) + "/min"}
            </strong>{" "}
            rate limit
          </>
        ),
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: () => (
          <>
            <strong>Event webhooks</strong>
          </>
        ),
      },
    ],
  },
];

export const FREE_PLAN = PLANS.find((plan) => plan.name === "Free")!;
export const PRO_PLAN = PLANS.find((plan) => plan.name === "Pro")!;
export const BUSINESS_PLAN = PLANS.find((plan) => plan.name === "Business")!;
export const ENTERPRISE_PLAN = PLANS.find(
  (plan) => plan.name === "Enterprise",
)!;

export const PUBLIC_PLANS = [
  FREE_PLAN,
  PRO_PLAN,
  BUSINESS_PLAN,
  ENTERPRISE_PLAN,
];

export const SELF_SERVE_PAID_PLANS = PLANS.filter(
  (p) => p.name !== "Free" && p.name !== "Enterprise",
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
