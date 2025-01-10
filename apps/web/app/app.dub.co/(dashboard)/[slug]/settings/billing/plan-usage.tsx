"use client";

import useTags from "@/lib/swr/use-tags";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import ManageSubscriptionButton from "@/ui/workspaces/manage-subscription-button";
import PlanBadge from "@/ui/workspaces/plan-badge";
import { buttonVariants, Icon, useRouterStuff } from "@dub/ui";
import {
  CircleDollar,
  CursorRays,
  Globe,
  Hyperlink,
  Tag,
  Users,
} from "@dub/ui/icons";
import {
  cn,
  getFirstAndLastDay,
  INFINITY_NUMBER,
  nFormatter,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { CSSProperties, useMemo } from "react";
import { UsageChart } from "./usage-chart";

export default function PlanUsage() {
  const {
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
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 xl:flex-row">
        <div>
          <h2 className="text-xl font-medium">Plan and Usage</h2>
          <p className="mt-1 text-balance text-sm leading-normal text-neutral-500">
            You are currently on the{" "}
            {plan ? (
              <PlanBadge plan={plan} />
            ) : (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-200">
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
        <div className="flex items-center gap-2">
          <Link
            href={`/${slug}/settings/billing/invoices`}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-8 w-full items-center justify-center rounded-md border px-4 text-sm",
            )}
          >
            View invoices
          </Link>
          {stripeId && <ManageSubscriptionButton />}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-neutral-200 border-t border-neutral-200">
        <div>
          <div
            className={cn(
              "grid gap-4 p-6 sm:grid-cols-2 md:p-8 lg:gap-6",
              conversionEnabled && "sm:grid-cols-3",
            )}
          >
            <UsageTabCard
              id="events"
              icon={CursorRays}
              title="Events tracked"
              usage={usage}
              limit={usageLimit}
            />
            <UsageTabCard
              id="links"
              icon={Hyperlink}
              title="Links created"
              usage={linksUsage}
              limit={linksLimit}
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
          <div className="w-full px-2 pb-8 md:px-8">
            <UsageChart />
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:divide-x sm:divide-y-0 md:grid-cols-3">
          <UsageCategory
            title="Custom Domains"
            icon={Globe}
            usage={domains?.length}
            usageLimit={domainsLimit}
          />
          <UsageCategory
            title="Tags"
            icon={Tag}
            usage={tags?.length}
            usageLimit={tagsLimit}
          />
          <UsageCategory
            title="Teammates"
            icon={Users}
            usage={users?.filter((user) => !user.isMachine).length}
            usageLimit={usersLimit}
          />
        </div>
      </div>
      {plan !== "enterprise" && (
        <div className="flex flex-col items-center justify-between space-y-3 border-t border-neutral-200 px-6 py-4 text-center md:flex-row md:space-y-0 md:px-8 md:text-left">
          <p className="text-sm text-neutral-500">
            {plan === "business max"
              ? "Need more clicks or links? Contact us for an Enterprise quote."
              : `For higher limits, upgrade to the ${nextPlan.name} plan.`}
          </p>
          <Link
            href={`/${slug}/upgrade`}
            className={cn(
              buttonVariants(),
              "flex h-8 w-fit items-center justify-center rounded-md border px-3 text-sm",
            )}
          >
            Upgrade to {nextPlan.name}
          </Link>
        </div>
      )}
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
}: {
  id: string;
  icon: Icon;
  title: string;
  usage?: number;
  limit?: number;
  unit?: string;
}) {
  const { searchParams, queryParams } = useRouterStuff();

  const isActive =
    searchParams.get("tab") === id ||
    (!searchParams.get("tab") && id === "events");

  const [usage, limit] =
    unit === "$" && usageProp !== undefined && limitProp !== undefined
      ? [usageProp / 100, limitProp / 100]
      : [usageProp, limitProp];

  const loading = usage === undefined || limit === undefined;
  const unlimited = limit !== undefined && limit >= INFINITY_NUMBER;
  const warning = !loading && !unlimited && usage >= limit * 0.9;
  console.log({ warning, usage, limit });
  const remaining = !loading && !unlimited ? Math.max(0, limit - usage) : 0;

  const prefix = unit || "";

  return (
    <button
      className={cn(
        "rounded-lg border border-neutral-300 bg-white px-4 py-3 text-left transition-colors duration-75 hover:bg-neutral-50 lg:px-5 lg:py-4",
        "outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600",
        isActive && "border-neutral-900 ring-1 ring-neutral-900",
      )}
      aria-selected={isActive}
      onClick={() => queryParams({ set: { tab: id } })}
    >
      <Icon className="size-4 text-neutral-600" />
      <div className="mt-1.5 text-sm text-neutral-600">{title}</div>
      <div className="mt-2">
        {!loading ? (
          <NumberFlow
            value={usage}
            className="text-xl leading-none text-neutral-900"
            format={
              unit === "$"
                ? {
                    style: "currency",
                    currency: "USD",
                    // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                    trailingZeroDisplay: "stripIfInteger",
                  }
                : {
                    notation: usage < INFINITY_NUMBER ? "standard" : "compact",
                  }
            }
          />
        ) : (
          <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
      <div className="mt-5">
        <div
          className={cn(
            "h-1 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors",
            loading && "bg-neutral-900/5",
          )}
        >
          {!loading && !unlimited && (
            <div
              className="animate-slide-right-fade size-full"
              style={{ "--offset": "-100%" } as CSSProperties}
            >
              <div
                className={cn(
                  "size-full rounded-full bg-gradient-to-r from-blue-500/80 to-blue-600",
                  warning && "from-neutral-900/10 via-red-500 to-red-600",
                )}
                style={{
                  transform: `translateX(-${100 - Math.max(Math.floor((usage / Math.max(0, usage, limit)) * 100), usage === 0 ? 0 : 1)}%)`,
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
              : `${prefix}${nFormatter(remaining, { full: true })} remaining of ${prefix}${nFormatter(limit, { full: limit < INFINITY_NUMBER })}`}
          </span>
        ) : (
          <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </button>
  );
}

function UsageCategory(data: {
  title: string;
  icon: Icon;
  usage?: number;
  usageLimit?: number;
}) {
  let { title, icon: Icon, usage, usageLimit } = data;

  return (
    <div className="flex items-center justify-between p-6 md:p-8">
      <div className="flex cursor-default items-center space-x-2">
        <Icon className="size-4 text-neutral-600" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="flex items-center gap-1.5 font-medium text-black">
        {usage || usage === 0 ? (
          <p>{nFormatter(usage, { full: true })}</p>
        ) : (
          <div className="size-6 animate-pulse rounded-md bg-neutral-200" />
        )}
        <span>/</span>
        <p className="text-neutral-400">
          {usageLimit && usageLimit >= INFINITY_NUMBER
            ? "∞"
            : nFormatter(usageLimit, { full: true })}
        </p>
      </div>
    </div>
  );
}
