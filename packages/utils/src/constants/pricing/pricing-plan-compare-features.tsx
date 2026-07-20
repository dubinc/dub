import { ReactNode } from "react";
import { nFormatter } from "../../functions/nformatter";
import { INFINITY_NUMBER } from "../misc";
import {
  getPlanLimitForPeriod,
  getPlanPeriodSuffix,
  PlanPeriod,
} from "./plan-period-utils";
import { PLANS } from "./pricing-plans";

export const PRICING_PLAN_COMPARE_FEATURES: {
  category: string;
  href: string;
  features: {
    text:
      | string
      | ((d: {
          id: string;
          plan: (typeof PLANS)[number];
          planPeriod?: PlanPeriod;
        }) => ReactNode);
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
        text: ({ plan, planPeriod = "monthly" }) => (
          <>
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(
                    getPlanLimitForPeriod({
                      limit: plan.limits.links,
                      planPeriod,
                    }),
                  )}
            </strong>{" "}
            new links
            {getPlanPeriodSuffix({
              planPeriod,
              isUnlimited: plan.name === "Enterprise",
            })}
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
        text: ({ id, plan, planPeriod = "monthly" }) =>
          id === "free" || id === "pro" ? (
            "No partner payouts"
          ) : (
            <>
              <strong>
                {plan.name === "Enterprise"
                  ? "Unlimited"
                  : `$${nFormatter(
                      getPlanLimitForPeriod({
                        limit: plan.limits.payouts,
                        planPeriod,
                      }) / 100,
                    )}`}
              </strong>{" "}
              partner payouts
              {getPlanPeriodSuffix({
                planPeriod,
                isUnlimited: plan.name === "Enterprise",
              })}
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
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ plan }) => (
          <>
            <strong>
              {plan.limits.partners === 0
                ? "No"
                : plan.limits.partners === INFINITY_NUMBER
                  ? "Unlimited"
                  : nFormatter(plan.limits.partners)}
            </strong>{" "}
            partners
          </>
        ),
        href: "https://dub.co/help/article/inviting-partners",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ plan }) => (
          <>
            <strong>
              {plan.limits.groups === 0
                ? "No"
                : plan.limits.groups === INFINITY_NUMBER
                  ? "Unlimited"
                  : nFormatter(plan.limits.groups)}
            </strong>{" "}
            partner groups
          </>
        ),
        href: "https://dub.co/help/article/partner-groups",
      },
      {
        check: {
          default: false,
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: ({ plan }) => (
          <>
            <strong>
              {plan.limits.partnerTags === 0
                ? "No"
                : plan.limits.partnerTags === INFINITY_NUMBER
                  ? "Unlimited"
                  : nFormatter(plan.limits.partnerTags)}
            </strong>{" "}
            partner tags
          </>
        ),
        href: "https://dub.co/help/article/partner-groups",
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
        text: "Partner referral rewards",
        href: "https://dub.co/help/article/partner-referrals",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Messaging center",
        href: "https://dub.co/help/article/messaging-partners",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Email campaigns",
        href: "https://dub.co/help/article/email-campaigns",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Social metrics bounties",
        href: "https://dub.co/help/article/program-bounties#social-metrics",
      },
      {
        check: {
          default: false,
          advanced: true,
          enterprise: true,
        },
        text: "Risk monitoring",
        href: "https://dub.co/help/article/risk-monitoring",
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
        text: ({ plan, planPeriod = "monthly" }) => (
          <>
            <strong>
              {plan.name === "Enterprise"
                ? "Unlimited"
                : nFormatter(
                    getPlanLimitForPeriod({
                      limit: plan.limits.clicks,
                      planPeriod,
                    }),
                  )}
            </strong>{" "}
            tracked events
            {getPlanPeriodSuffix({
              planPeriod,
              isUnlimited: plan.name === "Enterprise",
            })}
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
          business: true,
          advanced: true,
          enterprise: true,
        },
        text: "Role-based access control",
        href: "https://dub.co/help/article/folders-rbac",
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
        text: ({ id }) =>
          ({
            free: "Community support",
            pro: "Email support",
            business: "Email support",
            advanced: "Priority email support",
            enterprise: "Slack support with SLA",
          })[id],
      },
      {
        check: {
          default: false,
          enterprise: true,
        },
        text: "Dedicated success manager",
      },
    ],
  },
];
