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
    href: "https://dub.co/links",
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
        href: "https://dub.co/docs/concepts/deep-links/quickstart",
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
        text: "Unlimited partners",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Automated global payouts",
        href: "https://dub.co/help/article/partner-payouts",
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
            "No partner payouts"
          ) : (
            <>
              <strong>
                {plan.name === "Enterprise"
                  ? "Unlimited"
                  : `$${nFormatter(plan.limits.payouts / 100)}`}
              </strong>{" "}
              partner payouts
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
        text: ({ id }) =>
          id === "free" || id === "pro" ? (
            "No partner payouts"
          ) : (
            <>
              <strong>
                {
                  {
                    business: "5%",
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
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ id, plan }) =>
          id === "free" || id === "pro" ? (
            "No partner rewards"
          ) : (
            <>
              <strong>{plan.name === "Business" ? "Basic" : "Advanced"}</strong>{" "}
              partner rewards
            </>
          ),
        href: "https://dub.co/help/article/partner-rewards",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Dual-sided incentives",
        href: "https://dub.co/help/article/dual-sided-incentives",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "AI landing page generator",
        href: "https://dub.co/help/article/program-landing-page",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Embedded referral dashboard",
        href: "https://dub.co/docs/partners/embedded-referrals",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Partners API",
        href: "https://dub.co/docs/api-reference/endpoint/create-a-partner",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Email campaigns (beta)",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Fraud & risk prevention",
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: "Partner network access",
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
        text: "Conversion tracking",
        href: "https://dub.co/help/article/dub-conversions",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Customer insights",
        href: "https://dub.co/help/article/customer-insights",
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
                : nFormatter(plan.limits.api, { full: true }) + "/min"}
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
        text: "Audit logs",
      },
    ],
  },
  {
    category: "Support",
    href: "https://dub.co/contact/support",
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
