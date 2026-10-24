"use client";

import X from "@/ui/shared/icons/x";
import { Check, PLAN_FEATURE_ICONS, Tooltip } from "@dub/ui";
import { cn, getPricingPlanMainFeatures } from "@dub/utils";
import { CSSProperties, ReactNode, isValidElement, useContext } from "react";
import { PricingContext, PricingPlan } from "./pricing-context";

export function PlanFeatures({
  plan,
  index,
  className,
  style,
  titleClassName,
  itemClassName,
  excludeFeatureIds,
}: {
  plan: PricingPlan;
  index: number;
  className?: string;
  style?: CSSProperties;
  titleClassName?: string;
  itemClassName?: string;
  excludeFeatureIds?: string[];
}) {
  const { period, product, plans } = useContext(PricingContext);

  const heroFeatures =
    getPricingPlanMainFeatures(period)[product][plan.name] || [];

  return (
    <div className={cn("flex flex-col gap-3 text-sm", className)} style={style}>
      {/* `--index` orders staggered entrance animations from the top down */}
      <h4
        className={cn("font-semibold text-neutral-800", titleClassName)}
        style={{ "--index": 0 } as CSSProperties}
      >
        {featureSectionTitle(plans, index)}
      </h4>
      {heroFeatures.map(({ title, subtitle, features }, idx) => (
        <div key={idx} className="relative flex flex-col">
          {title && (
            <h4 className="mb-3 font-medium text-neutral-700">{title}</h4>
          )}
          {subtitle && <p className="mb-2.5 text-neutral-500">{subtitle}</p>}
          <ul className="flex flex-col gap-3">
            {features
              .filter(({ id }) => !id || !excludeFeatureIds?.includes(id))
              .map(({ id, text, tooltip, disabled }, idx) => {
                const Icon =
                  id && PLAN_FEATURE_ICONS[id] ? PLAN_FEATURE_ICONS[id] : Check;

                return (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-start gap-3 text-neutral-600",
                      disabled && "opacity-40",
                      itemClassName,
                    )}
                    style={{ "--index": idx + 1 } as CSSProperties}
                  >
                    {/* mt-0.5 centers the 16px icon on the first 20px line */}
                    {disabled ? (
                      <X className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <Icon className="mt-0.5 size-4 shrink-0" />
                    )}
                    {tooltip ? (
                      <Tooltip
                        content={
                          typeof tooltip === "string" || isReactNode(tooltip)
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
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Growth repeats Starter's features for now, so it gets its own list title
function featureSectionTitle(plans: PricingPlan[], index: number) {
  const { name } = plans[index];
  if (index === 0 || ["Business", "Growth"].includes(name)) {
    return "Key Features:";
  }

  return `Everything in ${plans[index - 1].name}, plus:`;
}

const isReactNode = (element: any): element is ReactNode =>
  isValidElement(element);
