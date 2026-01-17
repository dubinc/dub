import { ReactNode } from "react";
import { nFormatter } from "../../functions/nformatter";
import { PLANS } from "./pricing-plans";

type Plan = (typeof PLANS)[number];

type HeroFeature = {
  id?: string;
  text: string;
  disabled?: boolean;
  tooltip?:
    | ReactNode
    | {
        title: string;
        cta: string;
        href: string;
      };
};

const getLinksStandards = (plan: Plan): HeroFeature[] => {
  return [
    // Tracked clicks
    {
      id: "clicks",
      text:
        plan.name === "Enterprise"
          ? "Unlimited tracked clicks"
          : `${nFormatter(plan.limits.clicks)} tracked clicks/mo`,
    },
    // New links
    {
      id: "links",
      text:
        plan.name === "Enterprise"
          ? "Unlimited new links"
          : `${nFormatter(plan.limits.links)} new links/mo`,
    },
    {
      id: "retention",
      text: `${plan.limits.retention} analytics retention`,
    },
  ];
};

const getPartnersStandards = (plan: Plan): HeroFeature[] => [
  {
    id: "payouts",
    text:
      plan.name === "Enterprise"
        ? "Unlimited partner payouts"
        : `$${nFormatter(plan.limits.payouts / 100)} partner payouts/mo`,
    tooltip: {
      title:
        "Send payouts to your partners with 1-click (or automate it completely) – all across the world.",
      cta: "Learn more.",
      href: "https://dub.co/help/article/partner-payouts",
    },
  },
];

export const PRICING_PLAN_MAIN_FEATURES = {
  links: {
    Pro: [
      {
        features: [
          ...getLinksStandards(PLANS.find((p) => p.name === "Pro")!),
          {
            id: "advanced",
            text: "Advanced link features",
          },
          {
            id: "dotlink",
            text: "Free .link domain",
            tooltip: {
              title:
                "Get a free .link custom domain for 1 year with any of Dub's paid plans.",
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
        ],
      },
    ],
    Business: [
      {
        features: [
          ...getLinksStandards(PLANS.find((p) => p.name === "Business")!),
          {
            id: "conversions",
            text: "Conversion tracking",
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
        ],
      },
    ],
    Advanced: [
      {
        features: [
          ...getLinksStandards(PLANS.find((p) => p.name === "Advanced")!),
          {
            id: "slack",
            text: "Priority Slack support",
          },
        ],
      },
    ],
    Enterprise: [
      {
        features: [
          ...getLinksStandards(PLANS.find((p) => p.name === "Enterprise")!),
          {
            id: "sso",
            text: "SSO/SAML",
          },
          {
            id: "logs",
            text: "Audit logs",
          },
          {
            id: "sla",
            text: "Custom SLA",
          },
        ],
      },
    ],
  },
  partners: {
    Business: [
      {
        features: [
          ...getPartnersStandards(PLANS.find((p) => p.name === "Business")!),
          {
            id: "basicrewards",
            text: "Basic reward structures",
            tooltip: {
              title:
                "Create custom click, lead, or sale-based rewards, tailored to each partner's needs.",
              cta: "Learn more.",
              href: "https://dub.co/help/article/partner-rewards",
            },
          },
          {
            id: "conversions",
            text: "Dual-sided incentives",
            tooltip: {
              title:
                "Offer dual-sided incentives to your partners and the users they refer.",
              cta: "Learn more.",
              href: "https://dub.co/help/article/dual-sided-incentives",
            },
          },
          {
            id: "ailandingpage",
            text: "AI landing page generator",
            tooltip: {
              title:
                "Generate compelling landing pages using Dub AI to attract high-quality partners to join your program.",
              cta: "Learn more.",
              href: "https://dub.co/help/article/program-landing-page",
            },
          },
          {
            id: "webhooks",
            text: "Real-time event webhooks",
            tooltip: {
              title:
                "Get real-time notifications when a link is clicked or a QR code is scanned using webhooks.",
              cta: "Learn more.",
              href: "https://dub.co/docs/concepts/webhooks/introduction",
            },
          },
          {
            id: "customerinsights",
            text: "Basic email support",
          },
        ],
      },
    ],
    Advanced: [
      {
        features: [
          ...getPartnersStandards(PLANS.find((p) => p.name === "Advanced")!),
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
        ],
      },
    ],
    Enterprise: [
      {
        features: [
          ...getPartnersStandards(PLANS.find((p) => p.name === "Enterprise")!),
          {
            id: "partners",
            text: "Partner Network",
            tooltip: {
              title:
                "Get access to our network of 5,000+ active affiliate partners.",
            },
          },
          {
            id: "sso",
            text: "SSO/SAML",
            tooltip: {
              title:
                "Enable single sign-on (SSO) for your entire organization using SAML.",
              cta: "Learn more.",
              href: "https://dub.co/help/category/saml-sso",
            },
          },
          {
            id: "logs",
            text: "Audit logs",
          },
          {
            id: "sla",
            text: "Custom SLA",
          },
          {
            id: "success",
            text: "Dedicated success manager",
          },
        ],
      },
    ],
  },
};
