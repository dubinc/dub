"use client";

import { testIds } from "@/lib/e2e/test-ids";
import X from "@/ui/shared/icons/x";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import {
  Badge,
  Button,
  Check,
  PLAN_FEATURE_ICONS,
  ToggleGroup,
  Tooltip,
} from "@dub/ui";
import {
  ADVANCED_PLAN,
  BUSINESS_PLAN,
  cn,
  ENTERPRISE_PLAN,
  getPricingPlanMainFeatures,
  GROWTH_PLAN,
  PlanDetails,
  PRICING_PLAN_TAGLINES,
  PRO_PLAN,
  SCALE_PLAN,
  STARTER_PLAN,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CSSProperties, isValidElement, ReactNode, useState } from "react";
import { OnboardingProduct } from "../../use-onboarding-product";

// TODO: remove once Starter, Growth and Scale have their own Stripe prices
const PARTNERS_CHECKOUT_PLANS: Record<string, string> = {
  Starter: "business",
  Growth: "business",
  Scale: "advanced",
};

export function PlanSelector({ product }: { product: OnboardingProduct }) {
  const plans =
    product === "partners"
      ? [STARTER_PLAN, GROWTH_PLAN, SCALE_PLAN, ENTERPRISE_PLAN]
      : [PRO_PLAN, BUSINESS_PLAN, ADVANCED_PLAN];

  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  const [mobilePlanIndex, setMobilePlanIndex] = useState(() => {
    const defaultPlanName = product === "partners" ? "Growth" : "Business";
    return Math.max(
      0,
      plans.findIndex(
        (plan) => plan.name.toLowerCase() === defaultPlanName.toLowerCase(),
      ),
    );
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <ToggleGroup
        options={[
          {
            label: "Yearly",
            badge: (
              <Badge variant="blueGradient" className="py-0 text-xs">
                10% discount + 12x usage upfront
              </Badge>
            ),
            value: "yearly",
          },
          { label: "Monthly", value: "monthly" },
        ]}
        selected={period}
        selectAction={(option) => setPeriod(option as "monthly" | "yearly")}
        className="w-fit rounded-lg border-neutral-200 bg-neutral-100 p-0"
        optionClassName="rounded-lg px-4 h-9 normal-case text-xs leading-none text-neutral-800 data-[selected=false]:hover:bg-neutral-200/30 data-[selected=true]:text-neutral-800 sm:px-3"
        indicatorClassName="rounded-lg border-none bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_3px_0_rgba(0,0,0,0.08)]"
      />
      <div className="w-full overflow-hidden [container-type:inline-size]">
        <div
          className={cn(
            // Card, button and features rows line up across plans via subgrid
            "grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] grid-rows-[auto_auto_1fr] lg:overflow-hidden lg:rounded-xl lg:border lg:border-neutral-200 lg:[&>*:not(:last-child)]:border-r lg:[&>*:not(:last-child)]:border-neutral-200",

            // Mobile
            "max-lg:w-[calc(var(--cols)*100cqw+(var(--cols)-1)*32px)] max-lg:max-w-none max-lg:translate-x-[calc(-1*var(--index)*(100cqw+32px))] max-lg:gap-x-8 max-lg:transition-transform",
          )}
          style={
            {
              "--cols": plans.length,
              "--index": mobilePlanIndex,
            } as CSSProperties
          }
        >
          {plans.map((plan, index) => {
            const features =
              getPricingPlanMainFeatures(period)[product][plan.name] || [];

            const popularPlan =
              (product === "links" && plan.name === "Business") ||
              (product === "partners" && plan.name === "Growth");

            return (
              <div
                key={`${product}-${plan.name}`}
                className={cn(
                  "relative row-span-3 grid grid-rows-subgrid gap-y-2 bg-white p-2",

                  // Mobile swiping
                  "max-lg:transition-opacity",
                  index !== mobilePlanIndex &&
                    "max-lg:pointer-events-none max-lg:opacity-0",
                )}
              >
                <div className="flex flex-col justify-between gap-10 rounded-xl border border-[#EDEDED] bg-neutral-50 px-4 pb-[17px] pt-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-medium leading-7 tracking-[-0.02em] text-neutral-800">
                        {plan.name}
                      </h2>
                      {popularPlan && (
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
                    <p className="text-xs font-medium tracking-[-0.02em] text-neutral-500">
                      {PRICING_PLAN_TAGLINES[product][plan.name]}
                    </p>
                  </div>

                  {plan.name === "Enterprise" ? (
                    <span className="text-lg font-medium leading-7 tracking-[-0.02em] text-neutral-800">
                      Custom
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1 font-medium">
                      <NumberFlow
                        value={plan.price[period]!}
                        className="text-lg tabular-nums leading-7 tracking-[-0.02em] text-neutral-800"
                        format={{
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        }}
                        continuous
                      />
                      <span className="text-sm tracking-[-0.02em] text-neutral-900/50">
                        /month{period === "yearly" && ", billed yearly"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="h-full w-fit rounded-lg bg-neutral-200/50 px-2.5 transition-colors duration-75 hover:bg-neutral-300/50 enabled:active:bg-neutral-300/50 disabled:opacity-30 lg:hidden"
                    disabled={index === 0}
                    onClick={() => setMobilePlanIndex(index - 1)}
                  >
                    <ChevronLeft className="size-5 text-neutral-800" />
                  </button>
                  {plan.name === "Enterprise" ? (
                    <a
                      href="https://dub.co/contact/sales"
                      target="_blank"
                      className="w-full"
                    >
                      <Button
                        text="Contact us"
                        variant="secondary"
                        className="h-9 w-full rounded-[10px]"
                      />
                    </a>
                  ) : (
                    <UpgradePlanButton
                      plan={
                        PARTNERS_CHECKOUT_PLANS[plan.name] ??
                        plan.name.toLowerCase()
                      }
                      displayName={plan.name}
                      period={period}
                      className="h-9 w-full rounded-[10px]"
                      data-testid={testIds.onboarding.planCta(plan.name)}
                    />
                  )}
                  <button
                    type="button"
                    className="h-full w-fit rounded-lg bg-neutral-200/50 px-2.5 transition-colors duration-75 hover:bg-neutral-300/50 enabled:active:bg-neutral-300/50 disabled:opacity-30 lg:hidden"
                    disabled={index >= plans.length - 1}
                    onClick={() => setMobilePlanIndex(index + 1)}
                  >
                    <ChevronRight className="size-5 text-neutral-800" />
                  </button>
                </div>

                <div className="flex flex-col gap-3 px-4 py-3 text-sm">
                  <h4 className="font-semibold text-neutral-800">
                    {featureSectionTitle(plans, index)}
                  </h4>
                  {features.map(({ title, subtitle, features }, idx) => (
                    <div key={idx} className="relative flex flex-col">
                      {title && (
                        <h4 className="mb-3 font-medium text-neutral-700">
                          {title}
                        </h4>
                      )}
                      {subtitle && (
                        <p className="mb-2.5 text-neutral-500">{subtitle}</p>
                      )}
                      <ul className="flex flex-col gap-3">
                        {features.map(
                          ({ id, text, tooltip, disabled }, idx) => {
                            const Icon =
                              id && PLAN_FEATURE_ICONS[id]
                                ? PLAN_FEATURE_ICONS[id]
                                : Check;

                            return (
                              <li
                                key={idx}
                                className={cn(
                                  "flex items-start gap-3 text-neutral-600",
                                  disabled && "opacity-40",
                                )}
                              >
                                {/* mt-0.5 centers the 16px icon on the first 20px line */}
                                {disabled ? (
                                  <X className="mt-0.5 size-4 shrink-0" />
                                ) : Icon ? (
                                  <Icon className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                  <Check className="mt-0.5 size-4 shrink-0" />
                                )}
                                {tooltip ? (
                                  <Tooltip
                                    content={
                                      typeof tooltip === "string" ||
                                      isReactNode(tooltip)
                                        ? tooltip
                                        : `${tooltip.title}${tooltip.cta && tooltip.href ? ` [${tooltip.cta}](${tooltip.href})` : ""}`
                                    }
                                  >
                                    <p className="cursor-help underline decoration-dotted underline-offset-2">
                                      {text}
                                    </p>
                                  </Tooltip>
                                ) : (
                                  <p>{text}</p>
                                )}
                              </li>
                            );
                          },
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Growth repeats Starter's features for now, so it gets its own list title
function featureSectionTitle(plans: PlanDetails[], index: number) {
  const { name } = plans[index];
  if (index === 0 || ["Pro", "Business", "Growth"].includes(name)) {
    return "Key Features:";
  }

  return `Everything in ${plans[index - 1].name}, plus:`;
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
