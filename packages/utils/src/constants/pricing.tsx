import { currencyFormatter, nFormatter } from "../functions";
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

const BUSINESS_PLAN_MODIFIER = ({
  name = "Business",
  monthly = 59,
  yearly = 49,
  links = 5000,
  clicks = 150000,
  sales = 5000_00,
  domains = 40,
  folders = 10,
  users = 15,
  ids = [],
}: {
  name: string;
  monthly: number;
  yearly: number;
  links: number;
  clicks: number;
  sales: number;
  domains: number;
  folders: number;
  users: number;
  ids: string[];
}) => ({
  name,
  tagline: "For fast-growing startups and businesses looking to scale",
  link: "https://dub.co/help/article/business-plan",
  price: {
    monthly,
    yearly,
    ids,
  },
  limits: {
    links,
    clicks,
    sales,
    domains,
    tags: INFINITY_NUMBER,
    folders,
    users,
    ai: 1000,
    api: 3000,
  },
  colors: {
    bg: "bg-sky-900",
    text: "text-sky-900",
  },
  cta: {
    text: `Get started with ${name}`,
    shortText: `Get ${name}`,
    href: "https://app.dub.co/register",
    color: "bg-sky-900 hover:bg-sky-800 hover:ring-sky-100",
  },
  featureTitle: "Everything in Pro, plus:",
  features: [
    {
      id: "clicks",
      text: `${nFormatter(clicks)} tracked clicks/mo`,
    },
    {
      id: "links",
      text: `${Intl.NumberFormat("en-US").format(links)} new links/mo`,
    },
    {
      id: "sales",
      text: `${currencyFormatter(sales / 100)} tracked sales/mo`,
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
      text: `${domains} domains`,
    },
    {
      id: "users",
      text: `${users} users`,
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
});

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
    colors: {
      bg: "bg-black",
      text: "text-black",
    },
    cta: {
      text: "Start for free",
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
      monthly: 24,
      yearly: 19,
      ids: [
        "price_1LodNLAlJJEpqkPVQSrt33Lc", // old monthly
        "price_1LodNLAlJJEpqkPVRxUyCQgZ", // old yearly
        "price_1OTcQBAlJJEpqkPViGtGEsbb", // new monthly (test)
        "price_1OYJeBAlJJEpqkPVLjTsjX0E", // new monthly (prod)
        "price_1OTcQBAlJJEpqkPVYlCMqdLL", // new yearly (test)
        "price_1OYJeBAlJJEpqkPVnPGEZeb0", // new yearly (prod)
      ],
    },
    limits: {
      links: 1000,
      clicks: 50000,
      sales: 0,
      domains: 10,
      tags: 25,
      folders: 3,
      users: 5,
      ai: 1000,
      api: 600,
    },
    colors: {
      bg: "bg-blue-500",
      text: "text-blue-500",
    },
    cta: {
      text: "Get started with Pro",
      shortText: "Get Pro",
      href: "https://app.dub.co/register",
      color: "bg-black hover:bg-neutral-800 hover:ring-neutral-200",
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { id: "clicks", text: "50K tracked clicks/mo" },
      { id: "links", text: "1,000 new links/mo" },
      { id: "retention", text: "1-year analytics retention" },
      { id: "domains", text: "10 domains" },
      { id: "users", text: "5 users" },
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
        id: "dublink",
        text: "Premium dub.link domain",
        footnote: {
          title: "Stand out from the crowd with a premium dub.link domain.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/default-dub-domains#premium-dublink-domain",
        },
      },
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
  BUSINESS_PLAN_MODIFIER({
    name: "Business",
    monthly: 59,
    yearly: 49,
    links: 5000,
    clicks: 150000,
    sales: 5000_00,
    domains: 40,
    folders: 10,
    users: 15,
    ids: [
      "price_1LodLoAlJJEpqkPV9rD0rlNL", // old monthly
      "price_1LodLoAlJJEpqkPVJdwv5zrG", // oldest yearly
      "price_1OZgmnAlJJEpqkPVOj4kV64R", // old yearly
      "price_1OzNlmAlJJEpqkPV7s9HXNAC", // new monthly (test)
      "price_1OzNmXAlJJEpqkPVYO89lTdx", // new yearly (test)
      "price_1OzOFIAlJJEpqkPVJxzc9irl", // new monthly (prod)
      "price_1OzOXMAlJJEpqkPV9ERrjjbw", // new yearly (prod)
    ],
  }),
  BUSINESS_PLAN_MODIFIER({
    name: "Business Plus",
    monthly: 119,
    yearly: 99,
    links: 15000,
    clicks: 400000,
    sales: 15000_00,
    domains: 100,
    folders: 25,
    users: 30,
    ids: [
      "price_1OnWu0AlJJEpqkPVWk4144ZG", // monthly (test)
      "price_1OnWu0AlJJEpqkPVkDWVriAB", // yearly (test)
      "price_1OnaK3AlJJEpqkPVaCfCPdHi", // monthly (prod)
      "price_1OzObrAlJJEpqkPVh6D9HWGO", // yearly (prod)
    ],
  }),
  BUSINESS_PLAN_MODIFIER({
    name: "Business Extra",
    monthly: 249,
    yearly: 199,
    links: 40000,
    clicks: 1000000,
    sales: 40000_00,
    domains: 250,
    folders: 50,
    users: 50,
    ids: [
      "price_1OnWvCAlJJEpqkPVLzLHx5QD", // monthly (test)
      "price_1OnWvCAlJJEpqkPVHhCCvIOq", // yearly (test)
      "price_1OnaKJAlJJEpqkPVeJSvPfJb", // monthly (prod)
      "price_1OzOg1AlJJEpqkPVPlsrxoWm", // yearly (prod)
    ],
  }),
  BUSINESS_PLAN_MODIFIER({
    name: "Business Max",
    monthly: 499,
    yearly: 399,
    links: 100000,
    clicks: 2500000,
    sales: 100000_00,
    domains: 500,
    folders: 100,
    users: 100,
    ids: [
      "price_1OnWwLAlJJEpqkPVXtJyPqLk", // monthly (test)
      "price_1OnWwLAlJJEpqkPV4eMbOkNh", // yearly (test)
      "price_1OnaKOAlJJEpqkPVV6gkZPgt", // monthly (prod)
      "price_1OzOh5AlJJEpqkPVtCSX7dlE", // yearly (prod)
    ],
  }),
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
    colors: {
      bg: "bg-violet-600",
      text: "text-violet-600",
    },
    cta: {
      text: "Contact us",
      href: "/enterprise",
      color:
        "bg-white hover:bg-neutral-50 border border-neutral-200 hover:ring-neutral-100 text-neutral-800",
    },
    featureTitle: "Everything in Business, plus:",
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
