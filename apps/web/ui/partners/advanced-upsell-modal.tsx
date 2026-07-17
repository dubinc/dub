import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import {
  Button,
  Check,
  Grid,
  Modal,
  PLAN_FEATURE_ICONS,
  Switch,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import { capitalize, cn, INFINITY_NUMBER, nFormatter, PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";

const ADVANCED_PLAN = PLANS.find(({ name }) => name === "Advanced")!;

type AdvancedUpsellModalProps = {
  showAdvancedUpsellModal: boolean;
  setShowAdvancedUpsellModal: Dispatch<SetStateAction<boolean>>;
};

function AdvancedUpsellModal({
  showAdvancedUpsellModal,
  setShowAdvancedUpsellModal,
}: AdvancedUpsellModalProps) {
  const { queryParams } = useRouterStuff();

  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const features = useMemo(
    () => [
      {
        id: "payouts",
        text:
          ADVANCED_PLAN.limits.payouts < INFINITY_NUMBER
            ? `$${nFormatter(ADVANCED_PLAN.limits.payouts / 100)} partner payouts/mo`
            : "Unlimited partner payouts",
        tooltip: {
          title:
            "Send payouts to your partners with 1-click (or automate it completely) – all across the world.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/partner-payouts",
        },
      },
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
        id: "partnerreferrals",
        text: "Partner referral rewards",
        tooltip: {
          title:
            "[Reward partners for referring other partners](https://dub.co/help/article/partner-referrals) to your program.",
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
        id: "email",
        text: "Email campaigns + Messaging center",
        tooltip: {
          title:
            "Send [marketing/transactional emails](https://dub.co/help/article/email-campaigns) and communicate with your partners using our [messaging center](https://dub.co/help/article/messaging-partners).",
        },
      },
      {
        id: "bounties",
        text: "Social metrics bounties",
        tooltip: {
          title:
            "[Reward partners for creating viral content](https://dub.co/help/article/program-bounties#social-metrics) – with support for variable bonuses and earnings limits.",
        },
      },
      {
        id: "sso",
        text: "Risk monitoring",
        tooltip: {
          title:
            "Safeguard your partner program by automatically flagging, reviewing, and resolving suspicious activity.",
          cta: "Learn more.",
          href: "https://dub.co/help/article/risk-monitoring",
        },
      },
      {
        id: "partnergroups",
        text: "Unlimited partner groups & tags",
        tooltip: {
          title:
            "Create unlimited [partner groups](https://dub.co/help/article/partner-groups) and [tags](https://dub.co/help/article/partner-tags) to segment partners by rewards, discounts, performance, location, and more.",
        },
      },
    ],
    [],
  );

  return (
    <Modal
      showModal={showAdvancedUpsellModal}
      setShowModal={setShowAdvancedUpsellModal}
      onClose={() => queryParams({ del: "showAdvancedUpsellModal" })}
      className="flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden sm:max-h-[min(95dvh,720px)]"
    >
      <div className="scrollbar-hide relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden [mask-image:linear-gradient(black,transparent_280px)] sm:block">
          <Grid cellSize={35} patternOffset={[-29, -10]} />
        </div>

        <div className="relative flex min-w-0 flex-col gap-2">
          <div className="flex h-5 w-fit items-center justify-center rounded-md bg-violet-100 px-2 text-xs font-semibold text-violet-600">
            Upgrade to unlock
          </div>
          <h2 className="text-content-emphasis text-lg font-semibold">
            Get even more from your partner program
          </h2>
          <p className="text-content-subtle min-w-0 text-sm">
            When you upgrade to Advanced, you'll get access to higher payout
            limits, and other advanced features.
          </p>
        </div>

        <div className="border-default relative mt-6 flex min-w-0 flex-col rounded-xl border bg-white p-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="text-content-emphasis text-xl font-semibold">
              {ADVANCED_PLAN.name}
            </span>
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
                fn={() => setPeriod(period === "yearly" ? "monthly" : "yearly")}
                trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                thumbDimensions="size-3"
                thumbTranslate="translate-x-3"
              />
            </label>
          </div>

          <div className="text-content-default mt-0.5 flex flex-wrap items-baseline gap-x-1 text-base font-medium tabular-nums">
            <NumberFlow
              value={ADVANCED_PLAN.price[period]!}
              format={{
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              }}
              continuous
            />
            <span className="text-content-muted ml-1 text-sm font-medium">
              per month{period === "yearly" && ", billed yearly"}
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {features.map(({ id, text, tooltip }) => {
              const Icon =
                id && PLAN_FEATURE_ICONS[id] ? PLAN_FEATURE_ICONS[id] : Check;
              return (
                <li
                  key={id}
                  className="flex min-w-0 items-center gap-2 text-neutral-600"
                >
                  <Icon className="size-3 shrink-0 [&_*]:stroke-2" />
                  {tooltip ? (
                    <Tooltip
                      content={
                        tooltip.href && tooltip.cta
                          ? `${tooltip.title} [${tooltip.cta}](${tooltip.href})`
                          : tooltip.title
                      }
                    >
                      <span className="min-w-0 cursor-help underline decoration-dotted underline-offset-2">
                        {text}
                      </span>
                    </Tooltip>
                  ) : (
                    <p className="min-w-0">{text}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-6 flex min-w-0 flex-col gap-3">
          <UpgradePlanButton
            plan="advanced"
            period={period}
            text={`Continue with Advanced ${capitalize(period)}`}
            variant="primary"
          />
          <Button
            text="Maybe later"
            variant="secondary"
            onClick={() => {
              setShowAdvancedUpsellModal(false);
              queryParams({ del: "showAdvancedUpsellModal" });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useAdvancedUpsellModal(
  props?: Omit<
    AdvancedUpsellModalProps,
    "showAdvancedUpsellModal" | "setShowAdvancedUpsellModal"
  >,
) {
  const [showAdvancedUpsellModal, setShowAdvancedUpsellModal] = useState(false);

  return {
    setShowAdvancedUpsellModal,
    advancedUpsellModal: (
      <AdvancedUpsellModal
        showAdvancedUpsellModal={showAdvancedUpsellModal}
        setShowAdvancedUpsellModal={setShowAdvancedUpsellModal}
        {...props}
      />
    ),
  };
}
