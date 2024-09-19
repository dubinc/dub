"use client";

import { PlanFeatures } from "@/ui/workspaces/plan-features";
import { UpgradePlanButton } from "@/ui/workspaces/upgrade-plan-button";
import { Badge, CountingNumbers } from "@dub/ui";
import { ToggleGroup } from "@dub/ui/src/toggle-group";
import { PRO_PLAN, SELF_SERVE_PAID_PLANS } from "@dub/utils";
import { useState } from "react";

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

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium text-gray-900">{name}</h2>
        {name === "Pro" && <Badge variant="blue">Most popular</Badge>}
      </div>
      <p className="mt-2 text-3xl font-medium text-gray-900">
        <CountingNumbers className="tabular-nums" prefix="$">
          {selectedPlan.price[period]}
        </CountingNumbers>{" "}
        <span className="text-sm font-medium">
          per month
          {period === "yearly" && ", billed yearly"}
        </span>
      </p>
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
          text={`Get started with ${selectedPlan.name}`}
          plan={selectedPlan.name.toLowerCase()}
          period={period}
        />
      </div>
    </div>
  );
}
