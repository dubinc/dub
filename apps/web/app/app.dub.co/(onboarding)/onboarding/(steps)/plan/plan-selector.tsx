"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PlanFeatures } from "@/ui/workspaces/plan-features";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import { Badge, ToggleGroup } from "@dub/ui";
import { PRO_PLAN, SELF_SERVE_PAID_PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";

export function PlanSelector() {
  const [periodTab, setPeriodTab] = useState<"monthly" | "yearly">("yearly");

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
          selected={periodTab}
          selectAction={(period) =>
            setPeriodTab(period as "monthly" | "yearly")
          }
        />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <PlanCard name="Pro" plans={[PRO_PLAN]} period={periodTab} />
        <PlanCard
          name="Business"
          plans={SELF_SERVE_PAID_PLANS.filter(({ name }) =>
            name.startsWith("Business"),
          )}
          period={periodTab}
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  plans,
  period,
}: {
  name: string;
  plans: (typeof SELF_SERVE_PAID_PLANS)[number][];
  period: "monthly" | "yearly";
}) {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const selectedPlan = plans[selectedPlanIndex];

  const { plan } = useWorkspace();

  useEffect(() => {
    if (plan?.startsWith("business")) {
      const idx = plans.findIndex((p) => p.name.toLowerCase() === plan);
      if (idx !== -1) {
        setSelectedPlanIndex(idx);
      }
    }
  }, [plan]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-gray-900">{name}</h2>
        {name === "Pro" && <Badge variant="blue">Most popular</Badge>}
      </div>
      <div className="mt-2 text-3xl font-medium text-gray-900">
        <NumberFlow
          value={selectedPlan.price[period]!}
          className="tabular-nums"
          format={{
            style: "currency",
            currency: "USD",
            trailingZeroDisplay: "stripIfInteger",
          }}
          continuous
        />
        <span className="ml-1 text-sm font-medium">
          per month
          {period === "yearly" && ", billed yearly"}
        </span>
      </div>
      {plans.length > 1 && (
        <div className="mt-4">
          <ToggleGroup
            className="grid grid-cols-4"
            style={{ gridTemplateColumns: "1fr ".repeat(plans.length) }}
            options={plans.map((plan) => ({
              value: plan.name,
              label: plan.name.replace(name, "").trim() || "Basic",
            }))}
            selected={selectedPlan.name}
            selectAction={(name) =>
              setSelectedPlanIndex(plans.findIndex((p) => p.name === name))
            }
          />
        </div>
      )}
      <PlanFeatures className="mt-4" plan={selectedPlan.name} />
      <div className="mt-10 flex grow flex-col justify-end">
        <UpgradePlanButton
          plan={selectedPlan.name.toLowerCase()}
          period={period}
        />
      </div>
    </div>
  );
}
