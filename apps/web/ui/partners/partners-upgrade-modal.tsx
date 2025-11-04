import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import {
  Button,
  Check,
  Grid,
  Modal,
  PLAN_FEATURE_ICONS,
  SimpleTooltipContent,
  Switch,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import { cn, INFINITY_NUMBER, nFormatter, PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from "react";

const defaultDescriptions = {
  Advanced:
    "When you upgrade to Advanced, you'll get access to higher payout limits, advanced reward structures, embedded referral dashboard, and more.",
  Enterprise:
    "When you upgrade to Enterprise, you'll get access to unlimited payouts, unlimited partner groups, and more.",
};

type PartnersUpgradeModalProps = {
  plan?: string;
  description?: ReactNode;
  showPartnersUpgradeModal: boolean;
  setShowPartnersUpgradeModal: Dispatch<SetStateAction<boolean>>;
};

export function PartnersUpgradeModal({
  plan: planName = "Advanced",
  description,
  showPartnersUpgradeModal,
  setShowPartnersUpgradeModal,
}: PartnersUpgradeModalProps) {
  const { queryParams } = useRouterStuff();

  const plan = PLANS.find(({ name }) => name === planName)!;

  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const features = useMemo(
    () => [
      {
        id: "payouts",
        text:
          plan.limits.payouts < INFINITY_NUMBER
            ? `$${nFormatter(plan.limits.payouts / 100)} partner payouts/mo`
            : "Unlimited partner payouts",
        tooltip: {
          title:
            "Send payouts to your partners with 1-click (or automate it completely) – all across the world.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
        },
      },
      ...({
        Advanced: [
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
              cta: "Learn more.",
              href: "https://dub.co/help/article/messaging-partners",
            },
          },
          {
            id: "users",
            text: `${plan.limits.groups} partner groups`,
            tooltip: {
              title:
                "Learn how you can create partner groups to segment partners by rewards, discounts, performance, location, and more.",
              cta: "Learn more.",
              href: "https://dub.co/help/article/partner-groups",
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
        Enterprise: [
          {
            id: "users",
            text: "Unlimited partner groups",
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
      }[plan.name] ?? []),
    ],
    [plan],
  );

  return (
    <Modal
      showModal={showPartnersUpgradeModal}
      setShowModal={setShowPartnersUpgradeModal}
      onClose={() => queryParams({ del: "plan" })}
    >
      <div className="scrollbar-hide relative max-h-[calc(100dvh-50px)] overflow-y-auto p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[640px] -translate-x-1/2 [mask-image:linear-gradient(black,transparent_280px)] sm:block">
          <Grid cellSize={35} patternOffset={[-29, -10]} />
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex h-5 w-fit items-center justify-center rounded-md bg-violet-100 px-2 text-xs font-semibold text-violet-600">
            Upgrade to unlock
          </div>
          <h2 className="text-content-emphasis text-lg font-semibold">
            Get even more from your partner program
          </h2>
          <p className="text-content-subtle text-sm">
            {description ?? defaultDescriptions[plan.name]}
          </p>
        </div>

        <div className="border-default relative mt-6 flex flex-col rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-content-emphasis text-xl font-semibold">
              {plan.name}
            </span>
            {plan.name !== "Enterprise" && (
              <label className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold text-neutral-500 transition-colors",
                    period === "yearly" && "text-neutral-600",
                  )}
                >
                  Yearly
                </span>
                <Switch
                  checked={period === "yearly"}
                  fn={() =>
                    setPeriod(period === "yearly" ? "monthly" : "yearly")
                  }
                  trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                  thumbDimensions="size-3"
                  thumbTranslate="translate-x-3"
                />
              </label>
            )}
          </div>

          <div className="text-content-default mt-0.5 text-base font-medium tabular-nums">
            {plan.name !== "Enterprise" ? (
              <NumberFlow
                value={plan.price[period]!}
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                }}
                continuous
              />
            ) : (
              "Custom"
            )}
          </div>
          {plan.name !== "Enterprise" && (
            <span className="text-content-muted text-sm font-medium">
              per month{period === "yearly" && ", billed yearly"}
            </span>
          )}

          <div className="mt-6 flex flex-col gap-2 text-sm">
            {features.map(({ id, text, tooltip }) => {
              const Icon =
                id && PLAN_FEATURE_ICONS[id] ? PLAN_FEATURE_ICONS[id] : Check;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 text-neutral-600"
                >
                  <Icon className="size-3 shrink-0 [&_*]:stroke-2" />
                  {tooltip ? (
                    <Tooltip content={<SimpleTooltipContent {...tooltip} />}>
                      <span className="cursor-help underline decoration-dotted underline-offset-2">
                        {text}
                      </span>
                    </Tooltip>
                  ) : (
                    <p>{text}</p>
                  )}
                </li>
              );
            })}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3">
          {plan.name !== "Enterprise" ? (
            <UpgradePlanButton
              plan={plan.name.toLowerCase()}
              period={period}
              text={`Continue with ${plan.name}`}
              variant="primary"
            />
          ) : (
            <Link
              href="https://dub.co/contact/sales"
              target="_blank"
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-md text-center text-sm transition-all duration-200 ease-in-out",
                "hover:ring-border-subtle border border-black bg-black text-white shadow-sm hover:ring-4",
              )}
            >
              Contact us
            </Link>
          )}
          <Button
            text="Maybe later"
            variant="secondary"
            onClick={() => {
              setShowPartnersUpgradeModal(false);
              queryParams({ del: "plan" });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function usePartnersUpgradeModal(
  props: Omit<
    PartnersUpgradeModalProps,
    "showPartnersUpgradeModal" | "setShowPartnersUpgradeModal"
  >,
) {
  const [showPartnersUpgradeModal, setShowPartnersUpgradeModal] =
    useState(false);

  return {
    setShowPartnersUpgradeModal,
    partnersUpgradeModal: (
      <PartnersUpgradeModal
        showPartnersUpgradeModal={showPartnersUpgradeModal}
        setShowPartnersUpgradeModal={setShowPartnersUpgradeModal}
        {...props}
      />
    ),
  };
}
