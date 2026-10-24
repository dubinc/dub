"use client";

import {
  ADVANCED_PLAN,
  BUSINESS_PLAN,
  ENTERPRISE_PLAN,
  GROWTH_PLAN,
  PlanDetails,
  PRO_PLAN,
  SCALE_PLAN,
  STARTER_PLAN,
} from "@dub/utils";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from "react";
import { OnboardingProduct } from "../../use-onboarding-product";

// Mirrors the marketing pricing page (dub.co app/(site)/pricing/provider.tsx)

export type PricingPlan = PlanDetails & {
  id: string;
};

const PRODUCT_PLANS: Record<OnboardingProduct, PricingPlan[]> = {
  links: [PRO_PLAN, BUSINESS_PLAN, ADVANCED_PLAN, ENTERPRISE_PLAN].map(
    (plan) => ({ ...plan, id: plan.name.toLowerCase() }),
  ),
  partners: [STARTER_PLAN, GROWTH_PLAN, SCALE_PLAN, ENTERPRISE_PLAN].map(
    (plan) => ({ ...plan, id: plan.name.toLowerCase() }),
  ),
};

// A usage limit picked with a tier slider. Every tier is a dash on the slider.
type UsageMetricConfig = {
  id: string;
  // Text after the amount, e.g. "partner payouts/year"
  label: string;
  tooltip: string;
  currency?: boolean;
  // The plan feature this slider replaces in the feature lists
  featureId: string;
  // Yearly caps for each plan's tiers, keyed by plan id; the last plan's single
  // tier is open-ended
  // TODO: placeholder values until the real tiers (and their prices) are set
  tiers: Record<string, number[]>;
  // Dragging past the last tier raises the amount in these steps up to the
  // max, then shows ∞
  overflow: { step: number; max: number };
};

const USAGE_METRICS: Record<OnboardingProduct, UsageMetricConfig[]> = {
  links: [
    {
      id: "links",
      label: "new links/year",
      tooltip: "The number of new short links you can create each year.",
      featureId: "links",
      tiers: {
        pro: [3_000, 6_000, 9_000, 12_000],
        business: [120_000, 240_000, 360_000, 480_000],
        advanced: [600_000, 1_200_000, 1_800_000, 2_400_000],
        enterprise: [3_600_000],
      },
      overflow: { step: 100_000, max: 25_000_000 },
    },
    {
      id: "events",
      label: "tracked events/year",
      tooltip: "The number of clicks, leads and sales you can track each year.",
      featureId: "clicks",
      tiers: {
        pro: [150_000, 300_000, 450_000, 600_000],
        business: [3_000_000, 5_000_000, 7_000_000, 9_000_000],
        advanced: [12_000_000, 18_000_000, 24_000_000, 30_000_000],
        enterprise: [42_000_000],
      },
      overflow: { step: 1_000_000, max: 250_000_000 },
    },
  ],
  partners: [
    {
      id: "payouts",
      label: "partner payouts/year",
      tooltip:
        "The total amount you can pay out to your partners each year on this plan.",
      currency: true,
      featureId: "payouts",
      tiers: {
        starter: [2_000, 4_000, 6_000, 8_000],
        growth: [10_000, 15_000, 20_000, 25_000],
        scale: [35_000, 50_000, 65_000, 80_000],
        enterprise: [80_000],
      },
      overflow: { step: 10_000, max: 5_000_000 },
    },
  ],
};

export type UsageTier = {
  planIndex: number;
  // Position within its plan's tiers
  index: number;
  count: number;
  value: number;
};

export type UsageMetric = Omit<UsageMetricConfig, "tiers"> & {
  // Every plan's tiers in order, as they appear along the slider
  tiers: UsageTier[];
};

const resolveMetric = (
  product: OnboardingProduct,
  { tiers, ...metric }: UsageMetricConfig,
): UsageMetric => ({
  ...metric,
  tiers: PRODUCT_PLANS[product].flatMap(({ id }, planIndex) =>
    tiers[id].map((value, index) => ({
      planIndex,
      index,
      count: tiers[id].length,
      value,
    })),
  ),
});

const METRICS: Record<OnboardingProduct, UsageMetric[]> = {
  links: USAGE_METRICS.links.map((metric) => resolveMetric("links", metric)),
  partners: USAGE_METRICS.partners.map((metric) =>
    resolveMetric("partners", metric),
  ),
};

const POPULAR_PLAN_IDS: Record<OnboardingProduct, string> = {
  links: "business",
  partners: "growth",
};

const firstTierIndex = (metric: UsageMetric, planIndex: number) =>
  metric.tiers.findIndex((tier) => tier.planIndex === planIndex);

export type UsageSelection = {
  tierIndex: number;
  // Amount picked past the last tier: 0 when unused, Infinity past the max
  overflow: number;
};

// Sliders start on the first tier of the popular plan
const defaultUsage = (product: OnboardingProduct) =>
  Object.fromEntries(
    METRICS[product].map((metric) => [
      metric.id,
      {
        tierIndex: firstTierIndex(
          metric,
          PRODUCT_PLANS[product].findIndex(
            ({ id }) => id === POPULAR_PLAN_IDS[product],
          ),
        ),
        overflow: 0,
      },
    ]),
  ) as Record<string, UsageSelection>;

export const PricingContext = createContext<{
  // Plans are picked with the usage sliders, so the mobile plan follows the
  // focused plan and switching plans moves the sliders
  setMobilePlanIndex: (index: number) => void;
  product: OnboardingProduct;
  period: "monthly" | "yearly";
  setPeriod: Dispatch<SetStateAction<"monthly" | "yearly">>;
  plans: PricingPlan[];
  metrics: UsageMetric[];
  usage: Record<string, UsageSelection>;
  setUsage: (metricId: string, tierIndex: number, overflow?: number) => void;
  // The lowest plan that covers every slider's selection
  focusedPlanIndex: number;
  popularPlanId: string | undefined;
}>({
  setMobilePlanIndex: () => {},
  product: "partners",
  period: "yearly",
  setPeriod: () => {},
  plans: [],
  metrics: [],
  usage: {},
  setUsage: () => {},
  focusedPlanIndex: 0,
  popularPlanId: undefined,
});

export function PricingProvider({
  product,
  children,
}: {
  product: OnboardingProduct;
  children: ReactNode;
}) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [usage, setUsageState] = useState(() => defaultUsage(product));

  const plans = PRODUCT_PLANS[product];
  const metrics = METRICS[product];

  const focusedPlanIndex = Math.max(
    ...metrics.map(
      (metric) => metric.tiers[usage[metric.id].tierIndex].planIndex,
    ),
  );

  const setUsage = (metricId: string, tierIndex: number, overflow = 0) =>
    setUsageState((usage) => ({
      ...usage,
      [metricId]: { tierIndex, overflow },
    }));

  const setMobilePlanIndex = (planIndex: number) =>
    setUsageState((usage) => ({
      ...usage,
      ...Object.fromEntries(
        metrics.map((metric) => [
          metric.id,
          { tierIndex: firstTierIndex(metric, planIndex), overflow: 0 },
        ]),
      ),
    }));

  return (
    <PricingContext.Provider
      value={{
        setMobilePlanIndex,
        product,
        period,
        setPeriod,
        plans,
        metrics,
        usage,
        setUsage,
        focusedPlanIndex,
        popularPlanId: POPULAR_PLAN_IDS[product],
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}
