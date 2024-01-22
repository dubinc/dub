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
    },
    colors: {
      bg: "bg-black",
      text: "text-black",
    },
    cta: {
      text: "Start for free",
      href: "https://app.dub.co/register",
      color: "bg-black border-black hover:text-black",
    },
    featureTitle: "What's included:",
    features: [
      { text: "25 links/mo" },
      {
        text: "1K tracked clicks/mo",
      },
      { text: "30-day analytics retention" },
      { text: "3 custom domains" },
      { text: "1 user" },
      {
        text: "Community support",
        footnote: "Help center + GitHub discussions.",
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
    },
    colors: {
      bg: "bg-blue-500",
      text: "text-blue-500",
    },
    cta: {
      text: "Get started with Pro",
      shortText: "Get started",
      href: "https://app.dub.co/register",
      color: "bg-blue-500 border-blue-500 hover:text-blue-500",
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { text: "1,000 links/mo" },
      {
        text: "50K tracked clicks/mo",
      },
      { text: "1-year analytics retention" },
      { text: "10 custom domains" },
      { text: "5 users" },
      { text: "Basic support", footnote: "Basic email support." },
      {
        text: "Root domain redirect",
        footnote: {
          title:
            "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/how-to-redirect-root-domain",
        },
      },
      {
        text: "Advanced link features",
        footnote:
          "Custom social media cards, password-protected links, link expiration, link cloaking, device targeting, geo targeting, link aliases, link monitoring etc.",
      },
    ],
  },
  {
    name: "Business",
    tagline: "For larger teams with increased usage",
    price: {
      monthly: 49,
      yearly: 39,
      ids: [
        "price_1LodLoAlJJEpqkPVJdwv5zrG", // old yearly
        "price_1LoyrCAlJJEpqkPVZ32BV3wm", // new monthly (test)
        "price_1LodLoAlJJEpqkPV9rD0rlNL", // old & new monthly (prod, no change)
        "price_1OTcRzAlJJEpqkPV6G9iP0Tb", // new yearly (test)
        "price_1OZgmnAlJJEpqkPVOj4kV64R", // new yearly (prod)
      ],
    },
    limits: {
      links: 5000,
      clicks: 250000,
      domains: 20,
      tags: 150,
      users: 15,
    },
    colors: {
      bg: "bg-sky-900",
      text: "text-sky-900",
    },
    cta: {
      text: "Get started with Business",
      shortText: "Get started",
      href: "https://app.dub.co/register",
      color: "bg-sky-900 border-sky-900 hover:text-sky-900",
    },
    featureTitle: "Everything in Pro, plus:",
    features: [
      { text: "5,000 links/mo" },
      {
        text: "250K tracked clicks/mo",
      },
      { text: "2-year analytics retention" },
      { text: "20 custom domains" },
      { text: "15 users" },
      { text: "Elevated support", footnote: "Email and chat support." },
      {
        text: "Custom branding",
        footnote: {
          title:
            "Set custom QR code logos, password-protected links logos, and more.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/custom-qr-codes",
        },
      },
      {
        text: "Event callbacks (Beta)",
        footnote: "Get notified when someone clicks on your links.",
      },
    ],
  },
  {
    name: "Enterprise",
    price: {
      monthly: null,
      yearly: null,
    },
    limits: {
      links: null,
      clicks: null,
      domains: null,
    },
    colors: {
      bg: "bg-violet-600",
      text: "text-violet-600",
    },
    cta: {
      text: "Contact us",
      href: "/enterprise",
      color: "bg-violet-600 border-violet-600 hover:text-violet-600",
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

export const FREE_PLAN = PLANS.find((plan) => plan.name === "free")!;

export const SELF_SERVE_PAID_PLANS = PLANS.filter(
  (p) => p.name === "Pro" || p.name === "Business",
);

export const FREE_PROJECTS_LIMIT = 2;
