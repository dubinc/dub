import {
  AdvancedLinkFeaturesTooltip,
  Check,
  PLAN_FEATURE_ICONS,
  SimpleTooltipContent,
  Tooltip,
} from "@dub/ui";
import { cn, SELF_SERVE_PAID_PLANS, STAGGER_CHILD_VARIANTS } from "@dub/utils";
import { motion } from "framer-motion";

export function PlanFeatures({
  plan,
  className,
}: {
  plan: string;
  className?: string;
}) {
  const selectedPlan =
    SELF_SERVE_PAID_PLANS.find(
      (p) => p.name.toLowerCase() === plan.toLowerCase(),
    ) ?? SELF_SERVE_PAID_PLANS[0];

  return (
    <motion.div
      variants={{
        show: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
      initial="hidden"
      animate="show"
      className={cn("flex flex-col gap-2", className)}
    >
      {selectedPlan.featureTitle && (
        <motion.div
          key="business-plan-feature"
          variants={STAGGER_CHILD_VARIANTS}
          className="text-sm text-neutral-500"
        >
          {selectedPlan.featureTitle}
        </motion.div>
      )}
      {selectedPlan.features?.map(({ id, text, tooltip }, i) => {
        const Icon =
          id && PLAN_FEATURE_ICONS[id] ? PLAN_FEATURE_ICONS[id] : Check;

        return (
          <motion.div
            key={i}
            variants={STAGGER_CHILD_VARIANTS}
            className="flex items-center space-x-2 text-sm text-neutral-500"
          >
            <Icon className="size-4" />

            {tooltip ? (
              <Tooltip
                content={
                  typeof tooltip === "string" ? (
                    tooltip === "ADVANCED_LINK_FEATURES" ? (
                      <AdvancedLinkFeaturesTooltip />
                    ) : (
                      tooltip
                    )
                  ) : (
                    <SimpleTooltipContent {...tooltip} />
                  )
                }
              >
                <p className="cursor-help text-neutral-600 underline decoration-dotted underline-offset-2">
                  {text}
                </p>
              </Tooltip>
            ) : (
              <p className="text-neutral-600">{text}</p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
