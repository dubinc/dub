import { ReactNode } from "react";
import { nFormatter } from "../functions/nformatter";
import { INFINITY_NUMBER } from "./misc";
import { PLANS } from "./pricing";

export const PLAN_COMPARE_FEATURES: {
  category: string;
  href: string;
  features: {
    text:
      | string
      | ((d: { id: string; plan: (typeof PLANS)[number] }) => ReactNode);
    href?: string;
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
    category: "Links",
    href: "https://dub.co/home", // TODO: update to https://dub.co/links
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
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(plan.limits.links)}
            </strong>{" "}
            new links
            {plan.name === "Enterprise" ? "" : "/mo"}
          </>
        ),
      },
      {
        text: ({ plan }) => (
          <>
            <strong>
              {plan.limits.tags === INFINITY_NUMBER
                ? "Unlimited"
                : nFormatter(plan.limits.tags)}
            </strong>{" "}
            tags
          </>
        ),
        href: "https://dub.co/help/article/how-to-use-tags",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: ({ plan }) => (
          <>
            <strong>
              {plan.limits.folders === INFINITY_NUMBER
                ? "Unlimited"
                : nFormatter(plan.limits.folders)}
            </strong>{" "}
            folders
          </>
        ),
      },
      {
        text: "Custom QR codes",
        href: "https://dub.co/help/article/custom-qr-codes",
      },
      {
        text: "UTM builder + templates",
        href: "https://dub.co/help/article/how-to-create-utm-templates",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Custom link previews",
        href: "https://dub.co/help/article/custom-link-previews",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Deep links",
        href: "https://dub.co/help/article/custom-domain-deep-links",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Link cloaking",
        href: "https://dub.co/help/article/link-cloaking",
      },

      {
        check: {
          free: false,
          default: true,
        },
        text: "Link expiration",
        href: "https://dub.co/help/article/link-expiration",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Password protection",
        href: "https://dub.co/help/article/password-protected-links",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Device targeting",
        href: "https://dub.co/help/article/device-targeting",
      },
      {
        check: {
          free: false,
          default: true,
        },
        text: "Geo targeting",
        href: "https://dub.co/help/article/geo-targeting",
      },
      {
        check: {
          free: false,
          pro: false,
          default: true,
        },
        text: "A/B testing",
      },
    ],
  },
  {
    category: "Analytics",
    href: "https://dub.co/analytics",
    features: [
      {
        text: "Advanced analytics",
        href: "https://dub.co/help/article/dub-analytics",
      },
      {
        text: ({ plan }) => (
          <>
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(plan.limits.clicks)}
            </strong>{" "}
            tracked clicks
            {plan.name === "Enterprise" ? "" : "/mo"}
          </>
        ),
        href: "https://dub.co/help/article/dub-analytics-limits",
      },
      {
        text: ({ plan }) => (
          <>
            <strong>{plan.limits.retention}</strong> retention
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
        text: "Real-time events stream",
        href: "https://dub.co/help/article/real-time-events-stream",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Conversion tracking",
        href: "https://dub.co/help/article/dub-conversions",
      },
    ],
  },
  {
    category: "Partners",
    href: "https://dub.co/partners",
    features: [
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Partner management",
        href: "https://dub.co/help/article/dub-partners",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ id, plan }) =>
          id === "free" || id === "pro" ? (
            "No tracked sales"
          ) : (
            <>
              <strong>
                {plan.name === "Enterprise"
                  ? "Unlimited"
                  : `$${nFormatter(plan.limits.sales / 100)}`}
              </strong>{" "}
              tracked sales
              {plan.name === "Enterprise" ? "" : "/mo"}
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
        text: "1-click global payouts",
        href: "https://dub.co/help/article/partner-payouts",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ id }) =>
          id === "free" || id === "pro" ? (
            "No payouts"
          ) : (
            <>
              <strong>
                {
                  {
                    business: "7%",
                    advanced: "5%",
                    enterprise: "3%",
                  }[id]
                }
              </strong>{" "}
              payout fees
            </>
          ),
        href: "https://dub.co/help/article/partner-payouts#payout-fees-and-timing",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Tax compliance",
        href: "https://dub.co/help/article/partner-payouts#tax-compliance",
      },
      {
        check: {
          default: false,
          business: false,
          advanced: true,
          enterprise: true,
        },
        text: "White-labeling support",
        href: "https://dub.co/help/article/dub-partners#white-labeled-in-app-dashboard",
      },
      {
        check: {
          default: false,
          business: false,
          advanced: true,
          enterprise: true,
        },
        text: "Branded email domains",
      },
    ],
  },
  {
    category: "Domains",
    href: "https://dub.co/help/category/custom-domains",
    features: [
      {
        text: ({ plan }) => (
          <>
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(plan.limits.domains, { full: true })}
            </strong>{" "}
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
        href: "https://dub.co/help/article/default-dub-domains#premium-dublink-domain",
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
        href: "https://dub.co/help/article/free-dot-link-domain",
      },
    ],
  },
  {
    category: "API",
    href: "https://dub.co/docs/api-reference/introduction",
    features: [
      {
        text: "API Access",
        href: "https://dub.co/docs/api-reference/introduction",
      },
      {
        text: "Native SDKs",
        href: "https://dub.co/docs/sdks/overview",
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
        text: "Event webhooks",
        href: "https://dub.co/docs/concepts/webhooks/introduction",
      },
    ],
  },
  {
    category: "Workspace",
    href: "https://dub.co/help/category/workspaces",
    features: [
      {
        text: ({ plan }) => (
          <>
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(plan.limits.users)}
            </strong>{" "}
            user
            {plan.limits.users === 1 ? "" : "s"}
          </>
        ),
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Role-based access control",
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: "SAML/SSO",
        href: "https://dub.co/help/category/saml-sso",
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: "Custom SLA",
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: "Audit logs",
      },
    ],
  },
  {
    category: "Support",
    href: "https://dub.co/help", // TODO: update to https://dub.co/contact/support
    features: [
      {
        text: ({ id }) => (
          <>
            <strong>
              {
                {
                  free: "Basic support",
                  pro: "Elevated support",
                  business: "Priority support",
                  advanced: "Priority via Slack",
                  enterprise: "Priority with SLA",
                }[id]
              }
            </strong>
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
];
