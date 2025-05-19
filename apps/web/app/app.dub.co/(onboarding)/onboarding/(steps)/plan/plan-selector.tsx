"use client";

import { PlanFeatures } from "@/ui/workspaces/plan-features";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import { Badge, ToggleGroup } from "@dub/ui";
import { ADVANCED_PLAN, BUSINESS_PLAN, cn, PRO_PLAN } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CSSProperties, useState } from "react";

const plans = [PRO_PLAN, BUSINESS_PLAN, ADVANCED_PLAN];

export function PlanSelector() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);

  return (
    <div>
      <div className="flex justify-center">
        <ToggleGroup
          options={[
            { value: "monthly", label: "Pay monthly" },
            {
              value: "yearly",
              label: "Pay yearly",
              badge: <Badge variant="blue">Save 20%</Badge>,
            },
          ]}
          className="border-none"
          optionClassName="normal-case"
          indicatorClassName="border-none bg-neutral-200/70"
          selected={period}
          selectAction={(period) => setPeriod(period as "monthly" | "yearly")}
        />
      </div>
      <div className="mt-5 overflow-hidden [container-type:inline-size]">
        <div
          className={cn(
            "grid grid-cols-3 gap-x-4",

            // Mobile
            "max-lg:w-[calc(300cqw+2*32px)] max-lg:translate-x-[calc(-1*var(--index)*(100cqw+32px))] max-lg:gap-x-8 max-lg:transition-transform",
          )}
          style={
            {
              "--index": mobilePlanIndex,
            } as CSSProperties
          }
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6 pb-8"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-neutral-800">
                  {plan.name}
                </h2>
                {plan.name === "Business" && (
                  <Badge variant="blue">Most popular</Badge>
                )}
              </div>
              <div className="mt-1 text-base font-medium text-neutral-400">
                <NumberFlow
                  value={plan.price[period]!}
                  className="tabular-nums text-neutral-700"
                  format={{
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }}
                  continuous
                />
                <span className="ml-1 font-medium">
                  per month
                  {period === "yearly" && ", billed yearly"}
                </span>
              </div>
              <div className="my-6 flex gap-2">
                <button
                  type="button"
                  className="h-full w-fit rounded-lg bg-neutral-100 px-2.5 transition-colors duration-75 hover:bg-neutral-200/80 enabled:active:bg-neutral-200 disabled:opacity-30 lg:hidden"
                  disabled={mobilePlanIndex === 0}
                  onClick={() => setMobilePlanIndex(mobilePlanIndex - 1)}
                >
                  <ChevronLeft className="size-5 text-neutral-800" />
                </button>
                <UpgradePlanButton
                  plan={plan.name.toLowerCase()}
                  period={period}
                  text="Get started"
                  className="h-10 rounded-lg shadow-sm"
                />
                <button
                  type="button"
                  className="h-full w-fit rounded-lg bg-neutral-100 px-2.5 transition-colors duration-75 hover:bg-neutral-200/80 active:bg-neutral-200 disabled:opacity-30 lg:hidden"
                  disabled={mobilePlanIndex >= plans.length - 1}
                  onClick={() => setMobilePlanIndex(mobilePlanIndex + 1)}
                >
                  <ChevronRight className="size-5 text-neutral-800" />
                </button>
              </div>
              <PlanFeatures className="mt-2" plan={plan.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
