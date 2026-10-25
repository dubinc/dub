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
  getPricingPlanMainFeatures,
  PRICING_PLAN_TAGLINES,
  PRO_PLAN,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CSSProperties, isValidElement, ReactNode, useState } from "react";

const plans = [PRO_PLAN, BUSINESS_PLAN, ADVANCED_PLAN];

export function PlanSelector() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const [mobilePlanIndex, setMobilePlanIndex] = useState(() => {
    const defaultPlanName = "Business";
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
          { label: "Monthly", value: "monthly" },
          {
            label: "Yearly",
            badge: (
              <Badge variant="blueGradient" className="py-0 text-xs">
                10% discount + 12x usage upfront
              </Badge>
            ),
            value: "yearly",
          },
        ]}
        selected={period}
        selectAction={(option) => setPeriod(option as "monthly" | "yearly")}
        className="w-fit rounded-lg border-neutral-300 bg-neutral-100 p-0.5"
        optionClassName="text-xs normal-case text-neutral-800 data-[selected=true]:text-neutral-800 px-3 h-8 leading-none"
        indicatorClassName="bg-white border-neutral-200 rounded-md"
      />
      <div className="w-full overflow-hidden [container-type:inline-size] max-lg:rounded-lg">
        <div
          className={cn(
            "grid max-w-[calc(var(--cols)*342px)] grid-cols-[repeat(var(--cols),1fr)] lg:mx-auto",

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
          {plans.map((plan) => {
            const features =
              getPricingPlanMainFeatures(period).links[plan.name] || [];

            return (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col border-y border-l border-neutral-200 bg-white first:rounded-l-lg last:rounded-r-lg last:border-r",
                  "max-lg:overflow-hidden max-lg:rounded-lg max-lg:border-0 max-lg:ring-1 max-lg:ring-inset max-lg:ring-neutral-200",
                  plan.name === "Business" &&
                    "bg-gradient-to-b from-orange-50 to-40%",
                )}
              >
                <div className="flex grow flex-col gap-6 p-5 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-neutral-800">
                        {plan.name}
                      </h2>
                      {plan.name === "Business" && (
                        <div className="w-fit whitespace-nowrap rounded-full bg-orange-900 px-2 py-1.5 text-center text-[0.5rem] font-medium uppercase leading-none text-white">
                          Popular
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      {plan.name === "Enterprise" ? (
                        <span className="block text-base text-neutral-700">
                          Custom
                        </span>
                      ) : (
                        <>
                          <NumberFlow
                            value={plan.price[period]!}
                            className="text-base tabular-nums text-neutral-700"
                            format={{
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                            }}
                            continuous
                          />
                          <span className="text-sm text-neutral-400">
                            {" "}
                            per month
                            {period === "yearly" && ", billed yearly"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="min-h-10 text-sm text-neutral-600">
                    {PRICING_PLAN_TAGLINES.links[plan.name]}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="h-full w-fit rounded-lg bg-neutral-100 px-2.5 transition-colors duration-75 hover:bg-neutral-200/80 enabled:active:bg-neutral-200 disabled:opacity-30 lg:hidden"
                      disabled={mobilePlanIndex === 0}
                      onClick={() => setMobilePlanIndex(mobilePlanIndex - 1)}
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
                          className="h-10 rounded-lg shadow-sm"
                        />
                      </a>
                    ) : (
                      <UpgradePlanButton
                        plan={plan.name.toLowerCase()}
                        period={period}
                        className="h-10 rounded-lg shadow-sm"
                        data-testid={testIds.onboarding.planCta(plan.name)}
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
                  <div className="flex flex-col gap-3 text-sm">
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
                        <ul className="flex flex-col gap-2.5 pb-3">
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
                                    "flex items-center gap-2 text-neutral-600",
                                    disabled && "opacity-40",
                                  )}
                                >
                                  {disabled ? (
                                    <X className="size-3 shrink-0" />
                                  ) : Icon ? (
                                    <Icon className="size-4 shrink-0" />
                                  ) : (
                                    <Check className="size-3 shrink-0" />
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
