import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import {
  Button,
  Check,
  Grid,
  Modal,
  SimpleTooltipContent,
  Switch,
  Tooltip,
} from "@dub/ui";
import { cn, nFormatter, PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";

export function RewardsUpgradeModal({
  showRewardsUpgradeModal,
  setShowRewardsUpgradeModal,
}: {
  showRewardsUpgradeModal: boolean;
  setShowRewardsUpgradeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const plan = PLANS.find(({ name }) => name === "Advanced")!;

  const [isAnnual, setIsAnnual] = useState(true);

  const features = useMemo(
    () => [
      {
        id: "payouts",
        text: `$${nFormatter(plan.limits.payouts / 100)} partner payouts/mo`,
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
        id: "whitelabel",
        text: "White-labeling support",
        tooltip: {
          title:
            "Embed a white-labeled referral dashboard directly in your app in just a few lines of code.",
          cta: "Learn more.",
          href: "https://dub.co/docs/partners/white-labeling",
        },
      },
      {
        id: "email",
        text: "Email campaigns (beta)",
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
    [plan],
  );

  return (
    <Modal
      showModal={showRewardsUpgradeModal}
      setShowModal={setShowRewardsUpgradeModal}
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
            When you upgrade to Advanced, you&rsquo;ll get access higher payout
            limits, advanced reward structures, white-labeling support, and
            more.
          </p>
        </div>

        <div className="border-default relative mt-6 flex flex-col rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-content-emphasis text-xl font-semibold">
              {plan.name}
            </span>
            <label className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-xs font-semibold text-neutral-500 transition-colors",
                  isAnnual && "text-neutral-600",
                )}
              >
                Yearly
              </span>
              <Switch
                checked={isAnnual}
                fn={setIsAnnual}
                trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                thumbDimensions="size-3"
                thumbTranslate="translate-x-3"
              />
            </label>
          </div>

          <NumberFlow
            value={plan.price[isAnnual ? "yearly" : "monthly"]!}
            className="text-content-default mt-0.5 text-base font-medium tabular-nums"
            format={{
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }}
            continuous
          />
          <span className="text-content-muted text-sm font-medium">
            per month{isAnnual && ", billed yearly"}
          </span>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            {features.map(({ id, text, tooltip }) => (
              <li key={id} className="flex items-center gap-2 text-neutral-600">
                <Check className="size-2.5 shrink-0 [&_*]:stroke-2" />
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
            ))}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3">
          <UpgradePlanButton
            plan={plan.name.toLowerCase()}
            period={isAnnual ? "yearly" : "monthly"}
            text={`Continue with ${plan.name}`}
            variant="primary"
            openInNewTab
          />
          <Button
            text="Maybe later"
            variant="secondary"
            onClick={() => setShowRewardsUpgradeModal(false)}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useRewardsUpgradeModal() {
  const [showRewardsUpgradeModal, setShowRewardsUpgradeModal] = useState(false);

  return {
    setShowRewardsUpgradeModal,
    rewardsUpgradeModal: (
      <RewardsUpgradeModal
        showRewardsUpgradeModal={showRewardsUpgradeModal}
        setShowRewardsUpgradeModal={setShowRewardsUpgradeModal}
      />
    ),
  };
}
