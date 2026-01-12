"use client";

import { PlanFeatures } from "@/ui/workspaces/plan-features";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import { Badge, DubProductIcon, Switch } from "@dub/ui";
import { ADVANCED_PLAN, BUSINESS_PLAN, cn, PRO_PLAN } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CSSProperties, useState } from "react";
import { OnboardingProduct } from "../../use-onboarding-product";

const PRICING_PLAN_TAGLINES = {
  links: {
    Pro: "For small teams or creators needing advanced link features",
    Business: "For fast-growing startups and businesses looking to scale",
    Advanced: "For hyperscalers needing higher usage quotas",
    Enterprise: "For large organizations and governments with custom needs",
  },
  partners: {
    Business:
      "For fast-growing startups looking to scale with affiliates and referrals",
    Advanced:
      "For scaling teams with high-volume affiliate traffic and white-labeling needs",
    Enterprise:
      "For large organizations looking for dedicated support and unlimited usage",
  },
};

export function PlanSelector({ product }: { product: OnboardingProduct }) {
  const plans =
    product === "partners"
      ? [BUSINESS_PLAN, ADVANCED_PLAN]
      : [PRO_PLAN, BUSINESS_PLAN, ADVANCED_PLAN];

  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);

  return (
    <div className="overflow-hidden [container-type:inline-size]">
      <div
        className={cn(
          "mx-auto grid max-w-[calc(var(--cols)*342px)] grid-cols-[repeat(var(--cols),1fr)]",

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
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "border-y border-l border-neutral-200 bg-white first:rounded-l-lg last:rounded-r-lg last:border-r",
              product === "links" &&
                plan.name === "Business" &&
                "bg-gradient-to-b from-orange-50 to-40%",
              product === "partners" &&
                plan.name === "Advanced" &&
                "bg-gradient-to-b from-violet-50 to-40%",
            )}
          >
            <div className="flex flex-col gap-6 p-5 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-neutral-800">
                    {plan.name}
                  </h2>
                  {product === "links" && plan.name === "Business" && (
                    <div className="w-fit whitespace-nowrap rounded-full bg-orange-900 px-2 py-1.5 text-center text-[0.5rem] font-medium uppercase leading-none text-white">
                      Popular
                    </div>
                  )}
                  {product === "partners" && plan.name === "Advanced" && (
                    <div className="w-fit whitespace-nowrap rounded-full bg-violet-900 px-2 py-1.5 text-center text-[0.5rem] font-medium uppercase leading-none text-white">
                      Best Value
                    </div>
                  )}
                </div>
                <div className="mt-1">
                  <div>
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
                    <span className="text-sm text-neutral-400"> per month</span>
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-1.5">
                  <Switch
                    checked={period === "yearly"}
                    fn={(checked) => setPeriod(checked ? "yearly" : "monthly")}
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                    thumbDimensions="size-3"
                    thumbTranslate="translate-x-3"
                  />
                  <div className="flex items-center gap-1 text-sm font-medium text-neutral-600">
                    <span>Billed yearly</span>
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        "animate-in fade-in-0 slide-in-from-right-2 duration-150",
                        period === "monthly" && "-translate-x-2 opacity-0",
                      )}
                    >
                      2 months free
                    </Badge>
                  </div>
                </label>
              </div>

              <p className="min-h-10 text-sm text-neutral-600">
                {PRICING_PLAN_TAGLINES[product][plan.name]}
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

            {Boolean(
              (product === "links" && plan.limits.payouts) ||
                product === "partners",
            ) && (
              <div className="flex grow flex-col justify-end">
                <div className="relative z-0 bg-neutral-100">
                  <div className="border-border-subtle pointer-events-none relative z-10 -mx-px h-2.5 rounded-b-[0.625rem] border-x border-b bg-white" />
                  <a
                    href={`https://dub.co/${product === "links" ? "partners" : "links"}`}
                    target="_blank"
                    className="group peer relative z-10 flex items-center justify-center px-5 py-2.5 transition-transform duration-100 active:scale-[0.97]"
                  >
                    <div className="relative flex items-center gap-2 transition-[transform,opacity] group-hover:-translate-y-1 group-hover:opacity-0">
                      <DubProductIcon
                        product={product === "links" ? "partners" : "links"}
                        className="size-[1.125rem]"
                      />
                      <span className="text-content-default block text-sm">
                        Includes{" "}
                        <strong className="font-semibold">
                          Dub {product === "links" ? "Partners" : "Links"}
                        </strong>
                      </span>
                    </div>

                    <div className="absolute inset-0 flex translate-y-1 items-center justify-center opacity-0 transition-[transform,opacity] group-hover:translate-y-0 group-hover:opacity-100">
                      <span className="text-content-default block whitespace-nowrap text-sm font-medium">
                        Learn more ↗
                      </span>
                    </div>
                  </a>
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0 duration-100 peer-hover:opacity-5",
                      product === "links" ? "bg-violet-700" : "bg-orange-700",
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
