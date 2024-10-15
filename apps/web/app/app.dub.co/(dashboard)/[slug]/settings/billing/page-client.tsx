"use client";

import useTags from "@/lib/swr/use-tags";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import Infinity from "@/ui/shared/icons/infinity";
import PlanBadge from "@/ui/workspaces/plan-badge";
import {
  Button,
  buttonVariants,
  Icon,
  InfoTooltip,
  ProgressBar,
  useRouterStuff,
} from "@dub/ui";
import { CircleDollar, CursorRays, Hyperlink } from "@dub/ui/src/icons";
import { cn, getFirstAndLastDay, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useMemo, useState } from "react";
import { toast } from "sonner";
import { UsageChart } from "./usage-chart";

export default function WorkspaceBillingClient() {
  const router = useRouter();

  const {
    id: workspaceId,
    slug,
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
  } = useWorkspace();

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-8 lg:flex-row">
        <div>
          <h2 className="text-xl font-medium">Plan and Usage</h2>
          <p className="mt-1 text-balance text-sm leading-normal text-gray-500">
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
                fetch(`/api/workspaces/${workspaceId}/billing/manage`, {
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
        <div>
          <div
            className={cn(
              "grid gap-6 p-8 sm:grid-cols-2",
              conversionEnabled && "sm:grid-cols-3",
            )}
          >
            <UsageTabCard
              id="links"
              icon={Hyperlink}
              title="Links created"
              usage={linksUsage}
              limit={linksLimit}
              root
            />
            <UsageTabCard
              id="events"
              icon={CursorRays}
              title="Events tracked"
              usage={usage}
              limit={usageLimit}
            />
            {conversionEnabled && (
              <UsageTabCard
                id="revenue"
                icon={CircleDollar}
                title="Revenue tracked"
                usage={salesUsage}
                limit={salesLimit}
                unit="$"
              />
            )}
          </div>
          <div className="w-full px-8 pb-8">
            <UsageChart />
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-200 sm:divide-x sm:divide-y-0 md:grid-cols-3">
          <UsageCategory
            title="Custom Domains"
            unit="domains"
            tooltip="Number of custom domains added to your workspace."
            usage={domains?.length}
            usageLimit={domainsLimit}
            numberOnly
          />
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
      <div className="flex flex-col items-center justify-between space-y-3 px-8 py-4 text-center md:flex-row md:space-y-0 md:text-left">
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
              <Link
                href={`/${slug}/upgrade`}
                className={cn(
                  buttonVariants(),
                  "flex h-9 w-full items-center justify-center rounded-md border px-4 text-sm",
                )}
              >
                Upgrade to {nextPlan.name}
              </Link>
            )
          ) : (
            <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
      </div>
    </div>
  );
}

function UsageTabCard({
  id,
  icon: Icon,
  title,
  usage: usageProp,
  limit: limitProp,
  unit,
  root,
}: {
  id: string;
  icon: Icon;
  title: string;
  usage?: number;
  limit?: number;
  unit?: string;
  root?: boolean;
}) {
  const { searchParams, queryParams } = useRouterStuff();

  const isActive =
    searchParams.get("tab") === id || (!searchParams.get("tab") && root);

  const [usage, limit] =
    unit === "$" && usageProp !== undefined && limitProp !== undefined
      ? [usageProp / 100, limitProp / 100]
      : [usageProp, limitProp];

  const loading = usage === undefined || limit === undefined;
  const unlimited = limit !== undefined && limit >= 1000000000;
  const warning = !loading && !unlimited && usage >= limit * 0.9;
  const remaining = !loading && !unlimited ? Math.max(0, limit - usage) : 0;

  const prefix = unit || "";

  return (
    <button
      className={cn(
        "rounded-lg border border-neutral-300 bg-white px-5 py-4 text-left transition-colors duration-75 hover:bg-neutral-50",
        isActive && "border-neutral-900 ring-1 ring-neutral-900",
      )}
      aria-selected={isActive}
      onClick={() => queryParams({ set: { tab: id } })}
    >
      <Icon className="size-4 text-neutral-600" />
      <div className="mt-1.5 text-sm text-neutral-600">{title}</div>
      <div className="mt-2">
        {!loading ? (
          <div className="text-xl leading-none text-neutral-900">
            {prefix}
            {nFormatter(usage, { full: usage < 100000 })}
          </div>
        ) : (
          <div className="h-5 w-16 animate-pulse rounded-md bg-gray-200" />
        )}
      </div>
      <div className="mt-5">
        <div
          className={cn(
            "h-1 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors",
            loading && "bg-neutral-900/5",
          )}
        >
          {!loading && !unlimited && limit > usage && (
            <div
              className="animate-slide-right-fade size-full"
              style={{ "--offset": "-100%" } as CSSProperties}
            >
              <div
                className={cn(
                  "size-full rounded-full bg-gradient-to-r from-transparent to-violet-700",
                  warning && "to-rose-500",
                )}
                style={{
                  transform: `translateX(-${100 - Math.floor((usage / Math.max(0, usage, limit)) * 100)}%)`,
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 leading-none">
        {!loading ? (
          <span className="text-xs leading-none text-neutral-600">
            {unlimited
              ? "Unlimited"
              : `${prefix}${nFormatter(remaining, { full: remaining < 10000 })} remaining of ${prefix}${nFormatter(limit, { full: limit < 10000 })}`}
          </span>
        ) : (
          <div className="h-4 w-20 animate-pulse rounded-md bg-gray-200" />
        )}
      </div>
    </button>
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
    <div className="p-8">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <InfoTooltip content={tooltip} />
      </div>
      {numberOnly ? (
        <div className="mt-4 flex items-center gap-1.5">
          {usage || usage === 0 ? (
            <p className="text-lg font-medium text-black">
              {nFormatter(usage, { full: true })}
            </p>
          ) : (
            <div className="size-7 animate-pulse rounded-md bg-gray-200" />
          )}
          <span className="text-lg font-medium text-black">/</span>
          {usageLimit && usageLimit >= 1000000000 ? (
            <Infinity className="size-8 text-gray-500" />
          ) : (
            <p className="text-lg font-medium text-gray-400">
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
