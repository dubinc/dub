import { nFormatter } from "../functions";

const BUSINESS_PLAN_MODIFIER = ({
  name = "Business",
  monthly = 59,
  yearly = 49,
  links = 5000,
  clicks = 150000,
  domains = 40,
  tags = 150,
  users = 15,
  ids = [],
}: {
  name: string;
  monthly: number;
  yearly: number;
  links: number;
  clicks: number;
  domains: number;
  users: number;
  tags: number;
  ids: string[];
}) => ({
  name,
  tagline: "For larger teams with increased usage",
  link: "https://dub.co/help/article/business-plan",
  price: {
    monthly,
    yearly,
    ids,
  },
  limits: {
    links,
    clicks,
    domains,
    tags,
    users,
    ai: 1000,
    api: 3000,
  },
  colors: {
    bg: "bg-sky-900",
    text: "text-sky-900",
  },
  cta: {
    text: "Get started with Business",
    shortText: "Get started",
    href: "https://app.dub.co/register",
    color: "bg-black hover:bg-gray-800 hover:ring-gray-200",
  },
  featureTitle: "Everything in Pro, plus:",
  features: [
    { text: `${nFormatter(links, { full: true })} new links/mo` },
    {
      text: `${nFormatter(clicks)} tracked clicks/mo`,
    },
    { text: "3-year analytics retention" },
    { text: `${domains} custom domains` },
    { text: `${users} users` },
    {
      text: "Real-time events stream",
      footnote: {
        title:
          "Get more data on your link clicks and QR code scans with a detailed, real-time stream of events in your workspace",
        cta: "Learn more.",
        href: "https://d.to/events",
      },
    },
    {
      text: "Event webhooks (beta)",
      footnote: {
        title:
          "Get notified when a link is clicked or a QR code is scanned using webhooks.",
        cta: "Learn more.",
        href: "https://d.to/webhooks",
      },
    },
  ],
});

export const PLANS = [
  {
    name: "Free",
    tagline: "For hobby & side projects",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      links: 25,
      clicks: 1000,
      domains: 3,
      tags: 5,
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
      color: "bg-black hover:bg-gray-800 hover:ring-gray-200",
    },
    featureTitle: "What's included:",
    features: [
      { text: "25 new links/mo" },
      {
        text: "1K tracked clicks/mo",
      },
      { text: "30-day analytics retention" },
      { text: "3 custom domains" },
      { text: "1 user" },
      {
        text: "Advanced analytics",
        footnote: {
          title:
            "Get location (country, city, continent), device (type, browser, OS), and referer data on your clicks.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/dub-analytics",
        },
      },
      { text: "10 AI credits/mo" },
      {
        text: "Basic support",
      },
      {
        text: "API Access",
        footnote: {
          title: "Programatically manage your links using our REST API.",
          cta: "Learn more.",
          href: "https://dub.co/docs/api-reference/introduction",
        },
      },
    ],
  },
  {
    name: "Pro",
    tagline: "For startups & small businesses",
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
      domains: 10,
      tags: 25,
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
      shortText: "Get started",
      href: "https://app.dub.co/register",
      color: "bg-blue-600 hover:bg-blue-700 hover:ring-blue-100",
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { text: "1,000 new links/mo" },
      {
        text: "50K tracked clicks/mo",
      },
      { text: "1-year analytics retention" },
      { text: "10 custom domains" },
      { text: "5 users" },
      {
        text: "Advanced link features",
        footnote:
          "Custom social media cards, password-protected links, link expiration, link cloaking, device targeting, geo targeting etc.",
      },
      {
        text: "Unlimited AI credits",
        footnote: {
          title:
            "Subject to fair use policy – you will be notified if you exceed the limit, which are high enough for frequent usage.",
          cta: "Learn more.",
          href: "https://dub.co/blog/introducing-dub-ai",
        },
      },
      {
        text: "Priority support",
      },
      {
        text: "Premium dub.link domain",
        footnote: {
          title: "Stand out from the crowd with a premium dub.link domain.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/default-dub-domains#premium-dublink-domain",
        },
      },
      {
        text: "Complimentary custom domain",
        footnote: {
          title:
            "All our paid plans come with a free .link custom domain, which helps improve click-through rates.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/free-dot-link-domain",
        },
      },
    ],
  },
  BUSINESS_PLAN_MODIFIER({
    name: "Business",
    monthly: 59,
    yearly: 49,
    links: 5000,
    clicks: 150000,
    domains: 40,
    tags: 150,
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
    domains: 100,
    tags: 300,
    users: 40,
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
    domains: 250,
    tags: 500,
    users: 100,
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
    domains: 500,
    tags: 1000,
    users: 250,
    ids: [
      "price_1OnWwLAlJJEpqkPVXtJyPqLk", // monthly (test)
      "price_1OnWwLAlJJEpqkPV4eMbOkNh", // yearly (test)
      "price_1OnaKOAlJJEpqkPVV6gkZPgt", // monthly (prod)
      "price_1OzOh5AlJJEpqkPVtCSX7dlE", // yearly (prod)
    ],
  }),
  {
    name: "Enterprise",
    tagline:
      "Custom tailored plans for large enterprises. Whether you're running a SMS campaign with millions of short links or a large marketing campaign with billions of clicks, we've got you covered.",
    link: "https://dub.co/enterprise",
    price: {
      monthly: null,
      yearly: null,
    },
    limits: {
      links: 250000,
      clicks: 5000000,
      domains: 1000,
      tags: 1000,
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
        "bg-gradient-to-r from-violet-600 to-pink-600 hover:ring-violet-100",
    },
    featureTitle: "Everything in Business, plus:",
    features: [
      { text: "Custom usage limits" },
      { text: "Volume discounts" },
      { text: "SSO/SAML" },
      { text: "Role-based access controls" },
      { text: "Custom contract & SLA" },
      { text: "Whiteglove onboarding" },
      { text: "Dedicated success manager" },
      { text: "Priority support" },
      { text: "Dedicated Slack channel" },
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
