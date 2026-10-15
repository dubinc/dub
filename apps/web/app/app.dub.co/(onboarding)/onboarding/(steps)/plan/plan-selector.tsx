"use client";

import { Badge, ToggleGroup } from "@dub/ui";
import { useContext } from "react";
import { OnboardingProduct } from "../../use-onboarding-product";
import { PricingContext, PricingProvider } from "./pricing-context";
import { UsagePlans } from "./usage-plans";

export function PlanSelector({ product }: { product: OnboardingProduct }) {
  return (
    <PricingProvider product={product}>
      <div className="flex flex-col items-center gap-6">
        <PeriodToggle />
        <div className="w-full">
          <UsagePlans />
        </div>
      </div>
    </PricingProvider>
  );
}

function PeriodToggle() {
  const { period, setPeriod } = useContext(PricingContext);

  return (
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
      className="w-fit rounded-xl border-neutral-200 bg-neutral-100 p-0"
      optionClassName="rounded-xl px-4 py-2.5 h-10 normal-case text-xs leading-none text-neutral-800 data-[selected=false]:hover:bg-neutral-200/30 data-[selected=true]:text-neutral-800 sm:px-3"
      indicatorClassName="rounded-xl border-none bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_3px_0_rgba(0,0,0,0.08)]"
    />
  );
}
