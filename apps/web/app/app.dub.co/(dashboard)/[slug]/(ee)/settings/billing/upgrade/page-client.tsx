"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import {
  ChartLine,
  Check,
  CircleQuestion,
  ConnectedDots4,
  Globe,
  Hyperlink,
  Icon,
  Plug2,
  ToggleGroup,
  Users2,
} from "@dub/ui";
import {
  cn,
  getSuggestedPlan,
  isDowngradePlan,
  PLAN_COMPARE_FEATURES,
  PlanDetails,
  PLANS,
} from "@dub/utils";
import { isLegacyBusinessPlan } from "@dub/utils/src/constants/pricing";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { AdjustUsageRow } from "./adjust-usage-row";

const COMPARE_FEATURE_ICONS: Record<
  (typeof PLAN_COMPARE_FEATURES)[number]["category"],
  Icon
> = {
  Links: Hyperlink,
  Analytics: ChartLine,
  Partners: ConnectedDots4,
  Domains: Globe,
  Workspace: Users2,
  Support: CircleQuestion,
  API: Plug2,
};

export function WorkspaceBillingUpgradePageClient() {
  const {
    slug,
    plan: currentPlan,
    planTier: currentPlanTier = 1,
    stripeId,
    payoutsLimit,
  } = useWorkspace();

  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal();

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("showPartnersUpgradeModal")) {
      setShowPartnersUpgradeModal(true);
    }
  }, [searchParams]);

  const [eventsUsage, setEventsUsage] = useState<number | null>(null);
  const [linksUsage, setLinksUsage] = useState<number | null>(null);

  const recommendedPlan = useMemo(() => {
    if (!eventsUsage || !linksUsage) return null;

    return getSuggestedPlan({
      events: eventsUsage,
      links: linksUsage,
    });
  }, [linksUsage, eventsUsage]);

  const plans: { plan: PlanDetails; planTier: number }[] = useMemo(
    () =>
      ["Pro", "Business", "Advanced", "Enterprise"].map((p) => {
        const planDetails = PLANS.find(({ name }) => name === p)!;
        if (
          recommendedPlan &&
          recommendedPlan.plan.name.toLowerCase() === p.toLowerCase()
        ) {
          return recommendedPlan;
        }
        return { plan: planDetails, planTier: 1 };
      }),
    [recommendedPlan],
  );

  return (
    <div>
      {partnersUpgradeModal}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link
          href={`/${slug}/settings/billing`}
          title="Back to billing"
          className="group flex items-center gap-2"
        >
          <ChevronLeft
            className="mt-px size-5 text-neutral-500 transition-transform duration-100 group-hover:-translate-x-0.5"
            strokeWidth={2}
          />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Plans
          </h1>
        </Link>
        <ToggleGroup
          options={[
            { label: "Monthly", value: "monthly" },
            { label: "Yearly (2 months free)", value: "yearly" },
          ]}
          selected={period}
          selectAction={(option) => setPeriod(option as "monthly" | "yearly")}
          className="rounded-lg border-neutral-300 bg-neutral-100 p-0.5"
          optionClassName="text-xs text-neutral-800 data-[selected=true]:text-neutral-800 px-3 sm:px-5 py-2 leading-none"
          indicatorClassName="bg-white border-neutral-200 rounded-md"
        />
      </div>

      <div className="mt-6">
        <div className="sticky -top-px z-10">
          <div className="overflow-x-hidden rounded-b-[12px] from-neutral-200 [container-type:inline-size] lg:bg-gradient-to-t lg:p-px">
            <div
              className={cn(
                "grid grid-cols-4 gap-px overflow-hidden rounded-b-[11px] text-sm text-neutral-800 [&_strong]:font-medium",

                // Mobile
                "max-lg:w-[calc(400cqw+3*32px)] max-lg:translate-x-[calc(-1*var(--index)*(100cqw+32px))] max-lg:gap-x-8 max-lg:transition-transform",
              )}
              style={
                {
                  "--index": mobilePlanIndex,
                } as CSSProperties
              }
            >
              {plans.map(({ plan, planTier }, idx) => {
                // disable upgrade button if user has a Stripe ID and is on the current plan
                // (if there's no stripe id, they could be on a free trial so they should be able to upgrade)
                // edge case:
                //    if the user is on the business plan and has a payout limit of 0,
                //    it means they're on the legacy business plan – prompt them to upgrade to the new business plan
                const disableCurrentPlan = Boolean(
                  stripeId &&
                    plan.name.toLowerCase() === currentPlan &&
                    planTier === currentPlanTier &&
                    !isLegacyBusinessPlan({
                      plan: currentPlan,
                      payoutsLimit,
                    }),
                );

                // show downgrade button if user has a stripe id and is on the current plan
                const isDowngrade = Boolean(
                  stripeId &&
                    isDowngradePlan({
                      currentPlan: currentPlan || "free",
                      currentTier: currentPlanTier,
                      newPlan: plan.name,
                      newTier: planTier,
                    }),
                );

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative top-0 flex h-full flex-col gap-6 bg-white p-5 lg:p-3 xl:p-5",
                      "max-lg:rounded-xl max-lg:border max-lg:border-neutral-200",

                      idx !== mobilePlanIndex && "max-lg:opacity-0",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="py-1 text-base font-semibold leading-none text-neutral-800">
                          {plan.name}
                        </h3>
                        {recommendedPlan &&
                          !isDowngrade &&
                          plan.name === recommendedPlan.plan.name &&
                          planTier === recommendedPlan.planTier &&
                          !disableCurrentPlan && (
                            <div className="animate-fade-in flex h-6 min-w-0 items-center rounded-lg border border-blue-100 bg-blue-50 px-1.5 text-xs font-medium text-blue-600">
                              <span className="truncate">Recommended</span>
                            </div>
                          )}
                      </div>
                      <div className="relative mt-0.5 flex items-center gap-1">
                        {plan.name === "Enterprise" ? (
                          <span className="text-sm font-medium text-neutral-900">
                            Custom
                          </span>
                        ) : (
                          <>
                            <NumberFlow
                              value={plan.price[period]!}
                              className="text-sm font-medium tabular-nums text-neutral-700"
                              format={{
                                style: "currency",
                                currency: "USD",
                                minimumFractionDigits: 0,
                              }}
                              continuous
                            />
                            <span className="text-sm font-medium text-neutral-400">
                              per month
                              {period === "yearly" && ", billed yearly"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="h-full w-fit rounded-lg bg-neutral-100 px-2.5 transition-colors duration-75 hover:bg-neutral-200/80 enabled:active:bg-neutral-200 disabled:opacity-30 lg:hidden"
                        disabled={mobilePlanIndex === 0}
                        onClick={() => setMobilePlanIndex(mobilePlanIndex - 1)}
                      >
                        <ChevronLeft className="size-5 text-neutral-800" />
                      </button>
                      {plan.name === "Enterprise" && !disableCurrentPlan ? (
                        <Link
                          href="https://dub.co/contact/sales"
                          target="_blank"
                          className={cn(
                            "flex h-8 w-full items-center justify-center rounded-md text-center text-sm ring-gray-200 transition-all duration-200 ease-in-out",
                            "border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50",
                          )}
                        >
                          Contact us
                        </Link>
                      ) : (
                        <UpgradePlanButton
                          plan={plan.name.toLowerCase()}
                          tier={planTier > 1 ? planTier : undefined}
                          period={period}
                          disabled={
                            disableCurrentPlan || currentPlan === "enterprise"
                          }
                          text={
                            currentPlan === "enterprise"
                              ? "Contact support"
                              : disableCurrentPlan
                                ? "Current plan"
                                : isDowngrade
                                  ? "Downgrade"
                                  : "Upgrade"
                          }
                          variant={isDowngrade ? "secondary" : "primary"}
                          className="h-8 shadow-sm"
                        />
                      )}
                      <button
                        type="button"
                        className="h-full w-fit rounded-lg bg-neutral-100 px-2.5 transition-colors duration-75 hover:bg-neutral-200/80 active:bg-neutral-200 disabled:opacity-30 lg:hidden"
                        disabled={mobilePlanIndex >= plans.length - 1}
                        onClick={() => setMobilePlanIndex(mobilePlanIndex + 1)}
                      >
                        <ChevronRight className="size-5 text-neutral-800" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative -z-10 bg-white">
            <div className="bg-bg-muted border-subtle absolute inset-x-0 -top-2.5 bottom-0 rounded-b-[12px] border" />

            <AdjustUsageRow
              onLinksUsageChange={(value) => setLinksUsage(value)}
              onEventsUsageChange={(value) => setEventsUsage(value)}
            />
          </div>

          <div className="h-4 bg-gradient-to-b from-white" />
        </div>
        <div className="flex flex-col pb-12">
          {PLAN_COMPARE_FEATURES.map((section) => (
            <BillingCompareSection
              key={section.category}
              category={section.category}
              href={section.href}
              features={section.features}
              mobilePlanIndex={mobilePlanIndex}
              plans={plans}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingCompareSection({
  category,
  href,
  features,
  mobilePlanIndex,
  plans,
}: (typeof PLAN_COMPARE_FEATURES)[number] & {
  mobilePlanIndex: number;
  plans: { plan: PlanDetails; planTier: number }[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { defaultProgramId } = useWorkspace();

  useEffect(() => {
    if (category === "Links") {
      // If there's a default program, collapse Links. Otherwise expand.
      setIsExpanded(!defaultProgramId);
    } else if (category === "Partners") {
      // If there's no default program, collapse Partners. Otherwise expand.
      setIsExpanded(Boolean(defaultProgramId));
    } else {
      setIsExpanded(true);
    }
  }, [category, defaultProgramId]);

  const Icon = COMPARE_FEATURE_ICONS[category];

  return (
    <div className="w-full overflow-x-hidden [container-type:inline-size]">
      <div className="flex items-center justify-between border-b border-neutral-200">
        <button
          type="button"
          className="group flex grow items-center gap-2 px-5 py-4 text-left"
          onClick={() => setIsExpanded((e) => !e)}
        >
          <Icon className="size-4 text-neutral-600" />
          <h3 className="text-base font-medium text-black">{category}</h3>
          <ChevronRight
            className={cn(
              "size-4 text-neutral-400 transition-[transform,color] group-hover:text-neutral-500 [&_*]:stroke-2",
              isExpanded && "rotate-90",
            )}
          />
        </button>
        {href && (
          <Link
            href={href}
            target="_blank"
            className="mr-5 cursor-alias text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-2"
          >
            Learn more ↗
          </Link>
        )}
      </div>
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0 }}
        className={cn(
          "overflow-clip transition-opacity",
          !isExpanded && "opacity-0",
        )}
        inert={!isExpanded}
      >
        <table
          className={cn(
            "grid grid-cols-4 overflow-hidden text-sm text-neutral-800 [&_strong]:font-medium",

            // Mobile
            "max-lg:w-[calc(400cqw+3*32px)] max-lg:translate-x-[calc(-1*var(--index)*(100cqw+32px))] max-lg:gap-x-8 max-lg:transition-transform",
          )}
          style={
            {
              "--index": mobilePlanIndex,
            } as CSSProperties
          }
        >
          <thead className="sr-only">
            <tr>
              {plans.map(({ plan }) => (
                <th key={plan.name}>{plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="contents">
            {features.map(({ check, text, href }, idx) => {
              const As = href ? "a" : "span";

              return (
                <tr key={idx} className="contents bg-white">
                  {plans.map(({ plan }) => {
                    const id = plan.name.toLowerCase();
                    const isChecked =
                      typeof check === "boolean"
                        ? check
                        : check === undefined ||
                          (check[id] ?? check.default ?? false);

                    return (
                      <td
                        key={id}
                        className={cn(
                          "flex items-center gap-2 border-b border-neutral-200 bg-white px-5 py-4",
                          !isChecked && "text-neutral-300",
                        )}
                      >
                        {isChecked ? (
                          <Check className="size-3 text-neutral-500" />
                        ) : (
                          <span className="w-3">&bull;</span>
                        )}
                        <As
                          href={href}
                          target="_blank"
                          {...(href && {
                            className:
                              "cursor-help underline decoration-dotted underline-offset-2",
                          })}
                        >
                          {typeof text === "function"
                            ? (text({
                                id,
                                plan,
                              }) as React.ReactNode)
                            : text}
                        </As>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
