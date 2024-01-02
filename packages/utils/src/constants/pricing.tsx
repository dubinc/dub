import { APP_DOMAIN, HOME_DOMAIN } from ".";

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
    },
    colors: {
      bg: "bg-black",
      text: "text-black",
    },
    cta: {
      text: "Start for free",
      href: APP_DOMAIN,
      color: "bg-black border-black hover:text-black",
    },
    featureTitle: "What's included:",
    features: [
      { text: " 25 links/mo" },
      {
        text: " 1K tracked clicks/mo",
      },
      { text: "30-day analytics retention" },
      { text: "1 custom domain" },
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
          href: `${HOME_DOMAIN}/docs/api-reference/introduction`,
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
      ],
    },
    limits: {
      links: 250,
      clicks: 25000,
    },
    colors: {
      bg: "bg-blue-500",
      text: "text-blue-500",
    },
    cta: {
      text: "Get started with Pro",
      shortText: "Get started",
      href: APP_DOMAIN,
      color: "bg-blue-500 border-blue-500 hover:text-blue-500",
    },
    featureTitle: "Everything in Free, plus:",
    features: [
      { text: " 250 links/mo" },
      {
        text: " 25K tracked clicks/mo",
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
          href: `${HOME_DOMAIN}/help/article/how-to-redirect-root-domain`,
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
      ids: [],
    },
    limits: {
      links: 1000,
      clicks: 100000,
    },
    colors: {
      bg: "bg-sky-900",
      text: "text-sky-900",
    },
    cta: {
      text: "Get started with Business",
      shortText: "Get started",
      href: APP_DOMAIN,
      color: "bg-sky-900 border-sky-900 hover:text-sky-900",
    },
    featureTitle: "Everything in Pro, plus:",
    features: [
      { text: " 1,000 links/mo" },
      {
        text: " 100K tracked clicks/mo",
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
          href: `${HOME_DOMAIN}/help/article/custom-qr-codes`,
        },
      },
      {
        text: "Event callbacks",
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
