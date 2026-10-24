"use client";

// Mirrors the marketing pricing page (dub.co app/(site)/pricing/usage-plans.tsx),
// with the plan buttons going to checkout instead of sign up

import { testIds } from "@/lib/e2e/test-ids";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import { AnimatedSizeContainer, Button, Tooltip } from "@dub/ui";
import { PRICING_PLAN_TAGLINES, cn } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MotionConfig } from "motion/react";
import {
  CSSProperties,
  Fragment,
  useContext,
  useSyncExternalStore,
} from "react";
import { DrawnInfinityIcon } from "./drawn-infinity-icon";
import { PlanFeatures } from "./plan-features";
import {
  PricingContext,
  PricingPlan,
  UsageMetric,
  UsageSelection,
} from "./pricing-context";
import { UsageSlider } from "./usage-slider";

// TODO: remove once Starter and Growth have their own Stripe prices
const PARTNERS_CHECKOUT_PLANS: Record<string, string> = {
  Starter: "business",
  Growth: "business",
};

// Plans that lead to a sales demo instead of checkout
const DEMO_PLAN_NAMES = ["Advanced", "Scale", "Enterprise"];

const NUMBER_FORMAT = {
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
} as const;

const CURRENCY_FORMAT = {
  ...NUMBER_FORMAT,
  style: "currency",
  currency: "USD",
} as const;

const usageFormat = (metric: UsageMetric) =>
  metric.currency ? CURRENCY_FORMAT : NUMBER_FORMAT;

// Mobile plan sections fade down into place one after another, top to bottom,
// ordered by `--index` (plus `--reveal-offset` for nested lists)
const REVEAL_CLASSES =
  "animate-[slide-down-fade_0.5s_cubic-bezier(0.16,1,0.3,1)_calc((var(--index,0)_+_var(--reveal-offset,0))*45ms)_both] [--offset:-8px] motion-reduce:animate-none";

const revealIndex = (index: number) => ({ "--index": index }) as CSSProperties;

// Tailwind's `lg` breakpoint, where the plans switch from one card to four columns
const LG_QUERY = "(min-width: 1024px)";

// `null` until hydrated, so the server render doesn't guess the breakpoint
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(LG_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(LG_QUERY).matches,
    () => null,
  );
}

// Amount shown for a plan: the selected tier when the slider is on that plan,
// otherwise the tier closest to the selection (the top tier of lower plans,
// the first tier of higher ones)
function getPlanUsage(
  metric: UsageMetric,
  planIndex: number,
  { tierIndex, overflow }: UsageSelection,
) {
  const selectedTier = metric.tiers[tierIndex];
  const planTiers = metric.tiers.filter((tier) => tier.planIndex === planIndex);

  // The last plan is open-ended, so its single tier reads as a minimum
  const openEnded =
    planIndex === metric.tiers[metric.tiers.length - 1].planIndex;

  if (planIndex === selectedTier.planIndex && overflow > 0) {
    return { value: overflow, openEnded, plus: false };
  }

  const tier =
    planIndex === selectedTier.planIndex
      ? selectedTier
      : planIndex < selectedTier.planIndex
        ? planTiers[planTiers.length - 1]
        : planTiers[0];

  return { value: tier.value, openEnded, plus: openEnded };
}

export function UsagePlans() {
  const { plans, metrics, usage, focusedPlanIndex } =
    useContext(PricingContext);
  const isDesktop = useIsDesktop();

  // Screen reader text for each slider's current selection
  const valueText = (metric: UsageMetric) => {
    const selection = usage[metric.id];
    const planIndex = metric.tiers[selection.tierIndex].planIndex;
    const { value, plus } = getPlanUsage(metric, planIndex, selection);

    return `${
      value === Infinity
        ? "Unlimited"
        : new Intl.NumberFormat("en-US", usageFormat(metric)).format(value)
    }${plus ? "+" : ""} ${metric.label.replace("/", " per ")}, ${plans[planIndex].name} plan`;
  };

  // The open-ended last plan has a single tier, so it gets no slider on mobile
  const hasMobileSliders = focusedPlanIndex < plans.length - 1;

  return (
    <div className="animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]">
      {/* Number animations break when values change while hidden, so each
          layout only animates numbers while it's the one on screen */}
      <div className="hidden overflow-hidden rounded-xl border border-[#EDEDED] bg-neutral-50 lg:grid lg:grid-cols-4">
        {plans.map((plan, index) => (
          <PlanHeader
            key={plan.id}
            plan={plan}
            animated={isDesktop !== false}
            className={cn(index < focusedPlanIndex && "opacity-60")}
          />
        ))}

        {metrics.map((metric, metricIndex) => (
          <Fragment key={metric.id}>
            {plans.map((plan, index) => (
              <UsageLabel
                key={plan.id}
                metric={metric}
                planIndex={index}
                animated={isDesktop !== false}
                className={cn(
                  "px-4 pb-[17px]",
                  metricIndex === 0 ? "pt-10" : "pt-6",
                  index < focusedPlanIndex && "opacity-60",
                )}
              />
            ))}
            <UsageSlider
              metric={metric}
              className="col-span-full"
              valueText={valueText(metric)}
            />
          </Fragment>
        ))}

        {plans.map((plan, index) => (
          <PlanDetails key={plan.id} plan={plan} index={index} />
        ))}
      </div>

      <MotionConfig reducedMotion="user">
        <AnimatedSizeContainer
          height
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-xl border border-[#EDEDED] bg-neutral-50 lg:hidden"
        >
          {/* Remounting per plan replays the top-to-bottom reveal */}
          <div key={focusedPlanIndex} className="flex flex-col">
            <PlanHeader
              plan={plans[focusedPlanIndex]}
              animated={isDesktop !== true}
              className={REVEAL_CLASSES}
              style={revealIndex(0)}
            />

            {metrics.map((metric, metricIndex) => (
              <Fragment key={metric.id}>
                <UsageLabel
                  metric={metric}
                  planIndex={focusedPlanIndex}
                  animated={isDesktop !== true}
                  className={cn(
                    "px-4",
                    REVEAL_CLASSES,
                    metricIndex === 0 ? "pt-10" : hasMobileSliders && "pt-6",
                    hasMobileSliders || metricIndex === metrics.length - 1
                      ? "pb-[17px]"
                      : "pb-2",
                  )}
                  style={revealIndex(1 + metricIndex * 2)}
                />
                {hasMobileSliders && (
                  <UsageSlider
                    metric={metric}
                    planIndex={focusedPlanIndex}
                    className={REVEAL_CLASSES}
                    style={revealIndex(2 + metricIndex * 2)}
                    valueText={valueText(metric)}
                  />
                )}
              </Fragment>
            ))}

            <PlanDetails
              plan={plans[focusedPlanIndex]}
              index={focusedPlanIndex}
              revealFrom={1 + metrics.length * 2}
            />
          </div>
        </AnimatedSizeContainer>
      </MotionConfig>
    </div>
  );
}

function PlanHeader({
  plan,
  animated,
  className,
  style,
}: {
  plan: PricingPlan;
  animated: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { period, product, popularPlanId } = useContext(PricingContext);
  const { name, price } = plan;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-4 pt-4 transition-opacity duration-150",
        className,
      )}
      style={style}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium leading-6 tracking-[-0.02em] text-neutral-800">
          {name}
        </h3>
        {plan.id === popularPlanId && (
          <div
            className={cn(
              "w-fit whitespace-nowrap rounded-full px-1.5 pb-1 pt-[5px] text-center text-[0.5rem] font-semibold uppercase leading-[1.1]",
              product === "links"
                ? "bg-orange-200 text-orange-900"
                : "bg-violet-200 text-violet-900",
            )}
          >
            Most popular
          </div>
        )}
      </div>

      {name === "Enterprise" ? (
        <span className="text-2xl font-medium leading-8 tracking-[-0.02em] text-neutral-800">
          Custom
        </span>
      ) : (
        <div className="flex items-baseline gap-1 font-medium">
          <NumberFlow
            value={price[period]!}
            className="text-2xl tabular-nums leading-8 tracking-[-0.02em] text-neutral-800"
            format={{
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            }}
            animated={animated}
            continuous
          />
          <span className="text-sm tracking-[-0.02em] text-neutral-900/50">
            /month
          </span>
        </div>
      )}

      <p className="max-w-[260px] text-pretty text-xs font-medium tracking-[-0.02em] text-neutral-500">
        {PRICING_PLAN_TAGLINES[product][name]}
      </p>
    </div>
  );
}

function UsageLabel({
  metric,
  planIndex,
  animated,
  className,
  style,
}: {
  metric: UsageMetric;
  planIndex: number;
  animated: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { usage } = useContext(PricingContext);
  const { value, openEnded, plus } = getPlanUsage(
    metric,
    planIndex,
    usage[metric.id],
  );

  return (
    <div
      className={cn("transition-opacity duration-150", className)}
      style={style}
    >
      <p className="flex h-5 items-center gap-1 whitespace-nowrap text-sm font-medium tracking-[-0.02em] text-neutral-900">
        {!openEnded && <span className="opacity-50">Up to</span>}
        {value === Infinity ? (
          <DrawnInfinityIcon draw className="size-4" />
        ) : (
          <NumberFlow
            value={value}
            format={usageFormat(metric)}
            suffix={plus ? "+" : undefined}
            animated={animated}
            className="font-semibold tabular-nums"
          />
        )}
        <Tooltip content={metric.tooltip}>
          <span className="cursor-help underline decoration-dotted underline-offset-2 opacity-50">
            {metric.label}
          </span>
        </Tooltip>
      </p>
    </div>
  );
}

function PlanDetails({
  plan,
  index,
  revealFrom,
}: {
  plan: PricingPlan;
  index: number;
  // Reveal index for the buttons on mobile; omitted on desktop
  revealFrom?: number;
}) {
  const { period, plans, metrics, focusedPlanIndex, setMobilePlanIndex } =
    useContext(PricingContext);

  const reveal = revealFrom !== undefined;
  const focused = index === focusedPlanIndex;

  const buttonClassName = cn(
    "h-9 w-full rounded-[10px]",
    !focused &&
      "border-[#EDEDED] text-neutral-900 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]",
  );

  return (
    <div className="flex flex-col gap-7 px-3 pb-5 pt-3">
      <div
        className={cn("flex gap-3", reveal && REVEAL_CLASSES)}
        style={reveal ? revealIndex(revealFrom) : undefined}
      >
        <MobilePlanButton
          disabled={index === 0}
          onClick={() => setMobilePlanIndex(index - 1)}
        >
          <ChevronLeft className="size-5 text-neutral-800" />
        </MobilePlanButton>
        {/* Only the focused plan gets the primary style, the rest stay at full opacity */}
        {DEMO_PLAN_NAMES.includes(plan.name) ? (
          <a
            href="https://dub.co/contact/sales"
            target="_blank"
            className="w-full"
          >
            <Button
              text="Get a demo"
              variant={focused ? "primary" : "secondary"}
              className={buttonClassName}
            />
          </a>
        ) : (
          <UpgradePlanButton
            plan={PARTNERS_CHECKOUT_PLANS[plan.name] ?? plan.name.toLowerCase()}
            hidePlanName
            period={period}
            variant={focused ? "primary" : "secondary"}
            className={buttonClassName}
            // The mobile layout repeats the focused plan's button, so only the
            // desktop columns get test IDs
            data-testid={
              reveal ? undefined : testIds.onboarding.planCta(plan.name)
            }
          />
        )}
        <MobilePlanButton
          disabled={index >= plans.length - 1}
          onClick={() => setMobilePlanIndex(index + 1)}
        >
          <ChevronRight className="size-5 text-neutral-800" />
        </MobilePlanButton>
      </div>

      <PlanFeatures
        plan={plan}
        index={index}
        className={cn(
          "px-2 transition-opacity duration-150",
          index < focusedPlanIndex && "opacity-60",
        )}
        style={
          reveal
            ? ({ "--reveal-offset": revealFrom + 1 } as CSSProperties)
            : undefined
        }
        titleClassName={cn("pb-1", reveal && REVEAL_CLASSES)}
        // These limits are covered by the sliders and the lines above them
        excludeFeatureIds={metrics.map(({ featureId }) => featureId)}
        itemClassName={cn("gap-2", reveal && REVEAL_CLASSES)}
      />
    </div>
  );
}

function MobilePlanButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="w-fit self-stretch rounded-lg bg-neutral-200/50 px-2.5 transition-colors duration-75 hover:bg-neutral-300/50 enabled:active:bg-neutral-300/50 disabled:opacity-30 lg:hidden"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
