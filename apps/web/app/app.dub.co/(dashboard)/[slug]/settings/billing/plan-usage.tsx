"use client";

import useTagsCount from "@/lib/swr/use-tags-count";
import useUsers from "@/lib/swr/use-users";
import useWorkspace from "@/lib/swr/use-workspace";
import PlanBadge from "@/ui/workspaces/plan-badge";
import SubscriptionMenu from "@/ui/workspaces/subscription-menu";
import { buttonVariants, Icon, Tooltip, useRouterStuff } from "@dub/ui";
import {
  CircleDollar,
  CrownSmall,
  CursorRays,
  Folder5,
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
    foldersUsage,
    foldersLimit,
    tagsLimit,
    usersLimit,
    billingCycleStart,
    flags,
  } = useWorkspace();

  const { data: tags } = useTagsCount();
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

  const isMaxPlan = plan && ["business max", "advanced"].includes(plan);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 lg:flex-row">
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
          {plan === "free" ? (
            <Link
              href={`/${slug}/upgrade`}
              className={cn(
                buttonVariants({ variant: "primary" }),
                "flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border px-4 text-sm",
              )}
            >
              Upgrade Plan
            </Link>
          ) : (
            <Link
              href={`/${slug}/settings/billing/invoices`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border px-4 text-sm",
              )}
            >
              View invoices
            </Link>
          )}
          {stripeId && plan !== "free" && <SubscriptionMenu />}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-neutral-200 border-t border-neutral-200">
        <div>
          <div className="grid gap-4 p-6 sm:grid-cols-3 md:p-8 lg:gap-6">
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
            <UsageTabCard
              id="revenue"
              icon={CircleDollar}
              title="Revenue tracked"
              usage={salesUsage}
              limit={salesLimit}
              unit="$"
              requiresUpgrade={plan === "free" || plan === "pro"}
            />
          </div>
          <div className="w-full px-2 pb-8 md:px-8">
            <UsageChart />
          </div>
        </div>
        <div
          className={cn(
            "grid grid-cols-1 gap-[1px] overflow-hidden rounded-b-lg bg-neutral-200 md:grid-cols-3",
            flags?.linkFolders &&
              "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4",
          )}
        >
          <UsageCategory
            title="Custom Domains"
            icon={Globe}
            usage={domains?.length}
            usageLimit={domainsLimit}
          />
          {flags?.linkFolders && (
            <UsageCategory
              title="Folders"
              icon={Folder5}
              usage={foldersUsage}
              usageLimit={foldersLimit}
            />
          )}
          <UsageCategory
            title="Tags"
            icon={Tag}
            usage={tags}
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
      {plan !== "enterprise" && plan !== "free" && (
        <div className="flex flex-col items-center justify-between space-y-3 border-t border-neutral-200 px-6 py-4 text-center md:flex-row md:space-y-0 md:px-8 md:text-left">
          <p className="text-sm text-neutral-500">
            {isMaxPlan
              ? "Looking for higher limits / volume discounts? Contact us for an Enterprise quote."
              : `For higher limits, upgrade to the ${nextPlan.name} plan.`}
          </p>
          <Link
            href={isMaxPlan ? `https://dub.co/contact` : `/${slug}/upgrade`}
            {...(isMaxPlan && { target: "_blank" })}
            className={cn(
              buttonVariants(),
              "flex h-9 w-fit items-center justify-center rounded-md border px-3 text-sm",
            )}
          >
            {isMaxPlan ? "Contact us" : `Upgrade to ${nextPlan.name}`}
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
  requiresUpgrade,
}: {
  id: string;
  icon: Icon;
  title: string;
  usage?: number;
  limit?: number;
  unit?: string;
  requiresUpgrade?: boolean;
}) {
  const { searchParams, queryParams } = useRouterStuff();
  const { slug } = useWorkspace();

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
  const remaining = !loading && !unlimited ? Math.max(0, limit - usage) : 0;

  const prefix = unit || "";

  return (
    <button
      className={cn(
        "rounded-lg border border-neutral-300 bg-white px-4 py-3 text-left transition-colors duration-75",
        "outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600",
        isActive && "border-neutral-900 ring-1 ring-neutral-900",
        requiresUpgrade
          ? "border-neutral-100 bg-neutral-100 hover:bg-neutral-100"
          : "hover:bg-neutral-50 lg:px-5 lg:py-4",
      )}
      aria-selected={isActive}
      onClick={() => !requiresUpgrade && queryParams({ set: { tab: id } })}
      disabled={requiresUpgrade}
    >
      <Icon className="size-4 text-neutral-600" />
      <div className="mt-1.5 flex items-center gap-2 text-sm text-neutral-600">
        {title}
        {requiresUpgrade && (
          <Tooltip
            content={
              <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-600">
                Upgrade to Business to unlock conversion tracking.{" "}
                <Link
                  href={`/${slug}/upgrade`}
                  className="underline underline-offset-2 hover:text-neutral-800"
                >
                  View pricing plans
                </Link>
              </div>
            }
          >
            <span className="flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500">
              <CrownSmall className="size-" />
              Business
            </span>
          </Tooltip>
        )}
      </div>
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
                    // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
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
                  "size-full rounded-full",
                  requiresUpgrade
                    ? "bg-neutral-900/10"
                    : "bg-gradient-to-r from-blue-500/80 to-blue-600",
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
    <div className="flex items-center justify-between bg-white p-6 md:p-8">
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
