"use client";

import useWorkspace from "@/lib/swr/use-workspace";
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
import { cn, isDowngradePlan, PLAN_COMPARE_FEATURES, PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CSSProperties, useState } from "react";

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

const plans = ["Pro", "Business", "Advanced", "Enterprise"].map(
  (p) => PLANS.find(({ name }) => name === p)!,
);

export function WorkspaceBillingUpgradePageClient() {
  const { slug, plan: currentPlan, stripeId } = useWorkspace();

  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <div>
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
            { label: "Yearly", value: "yearly" },
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
              {plans.map((plan, idx) => {
                // disable upgrade button if user has a Stripe ID and is on the current plan
                // (if there's no stripe id, they could be on a free trial so they should be able to upgrade)
                const disableCurrentPlan = Boolean(
                  stripeId && plan.name.toLowerCase() === currentPlan,
                );

                // show downgrade button if user has a stripe id and is on the current plan
                const isDowngrade = Boolean(
                  stripeId && isDowngradePlan(currentPlan || "free", plan.name),
                );

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative top-0 flex h-full flex-col gap-6 bg-white p-5",
                      "max-lg:rounded-xl max-lg:border max-lg:border-neutral-200",

                      idx !== mobilePlanIndex && "max-lg:opacity-0",
                    )}
                  >
                    <div>
                      <h3 className="py-1 text-base font-semibold leading-none text-neutral-800">
                        {plan.name}
                      </h3>
                      <div>
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
                              </span>
                            </>
                          )}
                        </div>
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
                      {plan.name === "Enterprise" ? (
                        <Link
                          href="https://dub.co/contact/sales"
                          target="_blank"
                          className={cn(
                            "flex h-8 w-full items-center justify-center rounded-md text-center text-sm ring-gray-200 transition-all duration-200 ease-in-out",
                            "border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:bg-neutral-50",
                          )}
                        >
                          {plan.name === "Enterprise"
                            ? "Contact us"
                            : "Get started"}
                        </Link>
                      ) : (
                        <UpgradePlanButton
                          plan={plan.name.toLowerCase()}
                          period={period}
                          disabled={disableCurrentPlan}
                          text={
                            disableCurrentPlan
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
          <div className="h-8 bg-gradient-to-b from-white" />
        </div>
        <div className="flex flex-col gap-8 pb-12">
          {PLAN_COMPARE_FEATURES.map(({ category, href, features }) => {
            const Icon = COMPARE_FEATURE_ICONS[category];

            return (
              <div
                key={category}
                className="w-full overflow-x-hidden [container-type:inline-size]"
              >
                <a
                  href={href}
                  target="_blank"
                  className="flex items-center gap-2 border-b border-neutral-200 px-5 pb-4 pt-2"
                >
                  {Icon && <Icon className="size-4 text-neutral-600" />}
                  <h3 className="text-base font-medium text-black">
                    {category}
                  </h3>
                  <span className="text-xs text-neutral-500">↗</span>
                </a>
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
                      {plans.map(({ name }) => (
                        <th key={name}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="contents">
                    {features.map(({ check, text, href }, idx) => {
                      const As = href ? "a" : "span";

                      return (
                        <tr key={idx} className="contents bg-white">
                          {plans.map((plan) => {
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
                                      "underline decoration-dotted underline-offset-2 cursor-help",
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
