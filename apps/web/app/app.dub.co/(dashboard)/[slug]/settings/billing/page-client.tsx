"use client";

import useTags from "@/lib/swr/use-tags";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import { Divider } from "@/ui/shared/icons";
import Infinity from "@/ui/shared/icons/infinity";
import PlanBadge from "@/ui/workspaces/plan-badge";
import { Button, InfoTooltip, ProgressBar, useRouterStuff } from "@dub/ui";
import { cn, getFirstAndLastDay, getPlanDetails, nFormatter } from "@dub/utils";
import { trackEvent } from "fathom-client";
import { usePlausible } from "next-plausible";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import Confetti from "react-dom-confetti";
import { toast } from "sonner";

export default function WorkspaceBillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const workspace = useWorkspace();

  const {
    id,
    plan,
    stripeId,
    nextPlan,
    usage,
    usageLimit,
    salesUsage,
    salesLimit,
    linksUsage,
    linksLimit,
    domains,
    domainsLimit,
    tagsLimit,
    usersLimit,
    billingCycleStart,
    conversionEnabled,
  } = workspace;

  const { tags } = useTags();
  const { users } = useUsers();

  const [clicked, setClicked] = useState(false);

  const [billingStart, billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart);
      const start = firstDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
      return [start, end];
    }
    return [];
  }, [billingCycleStart]);

  const { queryParams } = useRouterStuff();
  const [confetti, setConfetti] = useState(false);

  const plausible = usePlausible();

  useEffect(() => {
    if (searchParams?.get("success")) {
      setConfetti(true);
      const plan = searchParams.get("plan");
      const period = searchParams.get("period");
      const currentPlan = plan ? getPlanDetails(plan) : undefined;
      toast.success(`Successfully upgraded to ${currentPlan?.name || plan}!`);
      if (currentPlan && period) {
        // track upgrade event
        trackEvent(`Upgraded to ${currentPlan.name}`, {
          _value: currentPlan.price[period] * 100, // in cents
        });
        plausible(`Upgraded to ${currentPlan.name}`);
        posthog.capture("plan_upgraded", {
          plan: currentPlan.name,
          period,
          revenue: currentPlan.price[period],
        });
      }
    }
  }, [searchParams, plan]);

  return (
    <>
      <Confetti active={confetti} config={{ elementCount: 200, spread: 90 }} />
      <div className="-mt-5 rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-start justify-between space-y-4 p-10 xl:flex-row xl:space-y-0">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Plan &amp; Usage</h2>
            <p className="text-sm text-gray-500">
              You are currently on the{" "}
              {plan ? (
                <PlanBadge plan={plan} />
              ) : (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-200">
                  load
                </span>
              )}{" "}
              plan.
              {billingStart && billingEnd && (
                <>
                  {" "}
                  Current billing cycle:{" "}
                  <span className="font-medium text-black">
                    {billingStart} - {billingEnd}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
          {stripeId && (
            <div>
              <Button
                text="Manage Subscription"
                variant="secondary"
                className="h-9"
                onClick={() => {
                  setClicked(true);
                  fetch(`/api/workspaces/${id}/billing/manage`, {
                    method: "POST",
                  }).then(async (res) => {
                    if (res.ok) {
                      const url = await res.json();
                      console.log({ url });
                      router.push(url);
                    } else {
                      const { error } = await res.json();
                      toast.error(error.message);
                      setClicked(false);
                    }
                  });
                }}
                loading={clicked}
              />
            </div>
          )}
        </div>
        <div className="grid divide-y divide-gray-200 border-y border-gray-200">
          <div
            className={cn(
              "grid grid-cols-1 divide-y divide-gray-200",
              conversionEnabled && "sm:grid-cols-2 sm:divide-x sm:divide-y-0",
            )}
          >
            {conversionEnabled && (
              <UsageCategory
                title="Revenue tracked"
                unit="$"
                tooltip="Amount of revenue tracked for your current billing cycle."
                usage={salesUsage}
                usageLimit={salesLimit}
              />
            )}
            <UsageCategory
              title={conversionEnabled ? "Events tracked" : "Link Clicks"}
              unit={conversionEnabled ? "events" : "clicks"}
              tooltip={
                conversionEnabled
                  ? "Number of events tracked for your current billing cycle (clicks, leads, sales)"
                  : "Number of billable link clicks for your current billing cycle. If you exceed your monthly limits, your existing links will still work and clicks will still be tracked, but you need to upgrade to view your analytics."
              }
              usage={usage}
              usageLimit={usageLimit}
              numberOnly={(linksLimit && linksLimit >= 1000000000) || false}
            />
          </div>
          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <UsageCategory
              title="Links Created"
              unit="links"
              tooltip="Number of short links created in the current billing cycle."
              usage={linksUsage}
              usageLimit={linksLimit}
              numberOnly={(linksLimit && linksLimit >= 1000000000) || false}
            />
            <UsageCategory
              title="Custom Domains"
              unit="domains"
              tooltip="Number of custom domains added to your workspace."
              usage={domains?.length}
              usageLimit={domainsLimit}
              numberOnly
            />
          </div>
          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <UsageCategory
              title="Tags"
              unit="tags"
              tooltip="Number of tags added to your workspace."
              usage={tags?.length}
              usageLimit={tagsLimit}
              numberOnly
            />
            <UsageCategory
              title="Teammates"
              unit="users"
              tooltip="Number of users added to your workspace."
              usage={users?.filter((user) => !user.isMachine).length}
              usageLimit={usersLimit}
              numberOnly
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-between space-y-3 px-10 py-4 text-center md:flex-row md:space-y-0 md:text-left">
          {plan ? (
            <p className="text-sm text-gray-500">
              {plan === "enterprise"
                ? "You're on the Enterprise plan."
                : plan === "business max"
                  ? "Need more clicks or links? Contact us for an Enterprise quote."
                  : `For higher limits, upgrade to the ${nextPlan.name} plan.`}
            </p>
          ) : (
            <div className="h-3 w-28 animate-pulse rounded-full bg-gray-200" />
          )}
          <div>
            {plan ? (
              plan === "enterprise" || plan === "business max" ? (
                <a
                  href="https://dub.co/enterprise"
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-md border border-violet-600 bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white hover:text-violet-600 focus:outline-none"
                >
                  Contact Sales
                </a>
              ) : (
                <Button
                  text={`Upgrade to ${nextPlan.name}`}
                  onClick={() =>
                    queryParams({
                      set: {
                        upgrade: nextPlan.name.toLowerCase(),
                      },
                    })
                  }
                  variant="success"
                />
              )
            ) : (
              <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function UsageCategory(data: {
  title: string;
  unit: string;
  tooltip: string;
  usage?: number;
  usageLimit?: number;
  numberOnly?: boolean;
}) {
  let { title, unit, tooltip, usage, usageLimit, numberOnly } = data;

  if (unit === "$" && usage !== undefined && usageLimit !== undefined) {
    usage = usage / 100;
    usageLimit = usageLimit / 100;
  }
  return (
    <div className="p-10">
      <div className="flex items-center space-x-2">
        <h3 className="font-medium">{title}</h3>
        <InfoTooltip content={tooltip} />
      </div>
      {numberOnly ? (
        <div className="mt-4 flex items-center">
          {usage || usage === 0 ? (
            <p className="text-2xl font-semibold text-black">
              {nFormatter(usage, { full: true })}
            </p>
          ) : (
            <div className="size-8 animate-pulse rounded-md bg-gray-200" />
          )}
          <Divider className="size-8 text-gray-500" />
          {usageLimit && usageLimit >= 1000000000 ? (
            <Infinity className="size-8 text-gray-500" />
          ) : (
            <p className="text-2xl font-semibold text-gray-400">
              {nFormatter(usageLimit, { full: true })}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col space-y-2">
          {usage !== undefined && usageLimit !== undefined ? (
            <p className="text-sm text-gray-600">
              {unit === "$" && unit}
              {nFormatter(usage, { full: true })} / {unit === "$" && unit}
              {nFormatter(usageLimit)} {unit !== "$" && unit} (
              {((usage / usageLimit) * 100).toFixed(1)}
              %)
            </p>
          ) : (
            <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
          )}
          <ProgressBar value={usage} max={usageLimit} />
        </div>
      )}
    </div>
  );
}
