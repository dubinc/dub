import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Grid, Slider } from "@dub/ui";
import {
  BUSINESS_PLAN,
  ENTERPRISE_PLAN,
  PlanPeriod,
  SELF_SERVE_PAID_PLANS,
  cn,
  getMonthlyLimitFromPeriod,
  getPlanDetails,
  getPlanLimitForPeriod,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AdjustUsageRow({
  planPeriod,
  onEventsUsageChange,
  onLinksUsageChange,
}: {
  planPeriod: PlanPeriod;
  onEventsUsageChange: (value: number) => void;
  onLinksUsageChange: (value: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        inert={!isExpanded}
        className={cn(
          "overflow-hidden transition-opacity ease-out",
          isExpanded ? "duration-500" : "opacity-0 duration-150",
        )}
      >
        <div className="grid grid-cols-1 gap-10 p-6 lg:grid-cols-2">
          <UsageSlider
            type="links"
            planPeriod={planPeriod}
            onChange={onLinksUsageChange}
          />
          <UsageSlider
            type="events"
            planPeriod={planPeriod}
            onChange={onEventsUsageChange}
          />
        </div>
      </motion.div>
      <div className="relative flex items-center justify-center overflow-hidden rounded-b-[12px] py-2">
        <div className="absolute inset-0 [mask-image:radial-gradient(70%_120%_at_50%_100%,black_50%,transparent)]">
          <Grid
            cellSize={21}
            patternOffset={[-1, 0]}
            className="text-border-subtle"
          />
        </div>

        <Button
          variant="secondary"
          text={isExpanded ? "Close" : "Adjust usage"}
          onClick={() => setIsExpanded((e) => !e)}
          className="relative h-6 w-fit rounded-lg px-1.5 text-xs"
        />
      </div>
    </div>
  );
}

function UsageSlider({
  type,
  planPeriod,
  onChange,
}: {
  type: "links" | "events";
  planPeriod: PlanPeriod;
  onChange: (value: number) => void;
}) {
  const workspace = useWorkspace();
  const { planPeriod: workspacePlanPeriod } = workspace;

  const limitKey = { events: "clicks" }[type] ?? type;
  const workspaceLimitKey = { events: "usageLimit", links: "linksLimit" }[type];

  const usageSteps = useMemo(
    () => [
      ...new Set(
        [...SELF_SERVE_PAID_PLANS, ENTERPRISE_PLAN]
          .flatMap((p) => [
            p.limits[limitKey],
            ...Object.values(p.tiers ?? {}).map(
              ({ limits }) => limits[limitKey],
            ),
          ])
          .sort((a, b) => a - b),
      ),
    ],
    [limitKey],
  );

  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const planTierParam = Number(searchParams.get("planTier")) || 1;

  const defaultValue = useMemo(() => {
    // we're not including planParam in the dependency array
    // to allow the slider to update when the plan changes
    if (planParam) {
      const planDetails = getPlanDetails({
        plan: planParam,
        planTier: planTierParam,
      });
      if (planDetails) {
        return planDetails.limits[limitKey];
      }
    }

    if (workspace.plan === "free") {
      return BUSINESS_PLAN.limits[limitKey];
    }

    const currentLimit = workspace[workspaceLimitKey];
    const monthlyCurrentLimit = getMonthlyLimitFromPeriod({
      limit: currentLimit,
      planPeriod: workspacePlanPeriod,
    });

    return usageSteps.reduce((prev, curr) =>
      Math.abs(curr - monthlyCurrentLimit) <
      Math.abs(prev - monthlyCurrentLimit)
        ? curr
        : prev,
    );
  }, [usageSteps, workspace, workspaceLimitKey, workspacePlanPeriod]);

  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const monthlySelectedValue = selectedValue ?? defaultValue;

  useEffect(() => {
    onChange(monthlySelectedValue);
  }, [monthlySelectedValue, onChange]);

  if (usageSteps.length < 2) return null;

  const monthlyWorkspaceLimit = getMonthlyLimitFromPeriod({
    limit: workspace[workspaceLimitKey],
    planPeriod: workspacePlanPeriod,
  });

  return (
    <div className="flex flex-col">
      <span className="text-content-default text-sm font-medium">
        {
          {
            events: `Events tracked per ${planPeriod === "yearly" ? "year" : "month"}`,
            links: `Links created per ${planPeriod === "yearly" ? "year" : "month"}`,
          }[type]
        }
      </span>
      <span className="text-content-emphasis text-lg font-semibold">
        <NumberFlow
          value={getPlanLimitForPeriod({
            limit: monthlySelectedValue,
            planPeriod,
          })}
        />
        {monthlyWorkspaceLimit === monthlySelectedValue && (
          <span className="animate-fade-in"> (current plan)</span>
        )}
      </span>

      <div className="mt-1">
        <Slider
          value={usageSteps.indexOf(monthlySelectedValue)}
          min={0}
          max={usageSteps.length - 1}
          onChange={(idx) => setSelectedValue(usageSteps[idx])}
          marks={usageSteps.map((_, idx) => idx)}
          className="[--thumb-radius:10px] [--track-height:14px]"
        />
      </div>
    </div>
  );
}
