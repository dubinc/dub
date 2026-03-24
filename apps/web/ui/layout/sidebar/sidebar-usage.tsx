"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { useStartPaidPlanModal } from "@/ui/modals/start-paid-plan-modal";
import ManageSubscriptionButton from "@/ui/workspaces/manage-subscription-button";
import {
  AnimatedSizeContainer,
  Button,
  buttonVariants,
  DynamicTooltipWrapper,
  Icon,
} from "@dub/ui";
import { CircleDollar, CursorRays, Hyperlink, Users } from "@dub/ui/icons";
import {
  cn,
  getFirstAndLastDay,
  getNextPlan,
  INFINITY_NUMBER,
  isWorkspaceBillingTrialActive,
  nFormatter,
  TRIAL_PARTNER_ENROLLMENT_CAP,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, forwardRef, useMemo, useState } from "react";

export function SidebarUsage() {
  const { slug } = useParams() as { slug?: string };

  return slug ? <UsageInner /> : null;
}

function UsageInner() {
  const {
    usage,
    usageLimit,
    linksUsage,
    linksLimit,
    payoutsUsage,
    payoutsLimit,
    billingCycleStart,
    plan,
    slug,
    paymentFailedAt,
    loading,
    trialEndsAt,
    role,
    defaultProgramId,
  } = useWorkspace({ swrOpts: { keepPreviousData: true } });

  const isTrial = isWorkspaceBillingTrialActive(trialEndsAt);

  const { partnersCount } = usePartnersCount<number>({
    status: "approved",
    ignoreParams: true,
    enabled: Boolean(isTrial && defaultProgramId),
  });

  const permissionsError = clientAccessCheck({
    action: "billing.write",
    role,
  }).error;

  const { StartPaidPlanModal, setShowStartPaidPlanModal } =
    useStartPaidPlanModal();

  const trialDaysLeft = useMemo(() => {
    if (!trialEndsAt || !isWorkspaceBillingTrialActive(trialEndsAt)) {
      return null;
    }
    const end = new Date(trialEndsAt);
    const days = Math.ceil(
      (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, days);
  }, [trialEndsAt]);

  const [billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { lastDay } = getFirstAndLastDay(billingCycleStart);
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return [end];
    }
    return [];
  }, [billingCycleStart]);

  const [hovered, setHovered] = useState(false);

  const nextPlan = getNextPlan(plan);

  // Warn the user if they're >= 90% of any limit
  const warnings = useMemo(
    () =>
      [
        [usage, usageLimit],
        [linksUsage, linksLimit],
      ].map(
        ([usage, limit]) =>
          usage !== undefined &&
          limit !== undefined &&
          usage / Math.max(0, usage, limit) >= 0.9,
      ),
    [usage, usageLimit, linksUsage, linksLimit],
  );

  const warning = warnings.some((w) => w);

  return loading || usage !== undefined ? (
    <>
      {isTrial ? <StartPaidPlanModal /> : null}
      <AnimatedSizeContainer height>
        <div className="border-t border-neutral-300/80 p-3">
          {isTrial ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-neutral-900">
                Free trial
              </span>

              <Link
                className="group flex shrink-0 items-center gap-0.5 text-sm font-normal text-neutral-600 transition-colors hover:text-neutral-700"
                href={`/${slug}/settings/billing`}
              >
                {trialDaysLeft != null
                  ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
                  : "Trial"}
                <ChevronRight className="size-3 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
              </Link>
            </div>
          ) : (
            <Link
              className="group flex items-center gap-0.5 text-sm font-normal text-neutral-500 transition-colors hover:text-neutral-700"
              href={`/${slug}/settings/billing`}
            >
              Usage
              <ChevronRight className="size-2 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
            </Link>
          )}

          <div
            className={cn("mt-4 flex flex-col", isTrial ? "gap-3" : "gap-4")}
          >
            {isTrial ? (
              <>
                <UsageRow
                  icon={CursorRays}
                  label="Events"
                  usage={usage}
                  limit={usageLimit}
                  showNextPlan={false}
                  nextPlanLimit={undefined}
                  warning={warnings[0]}
                  hideProgressBar
                />
                <UsageRow
                  icon={Hyperlink}
                  label="Links"
                  usage={linksUsage}
                  limit={linksLimit}
                  showNextPlan={false}
                  nextPlanLimit={undefined}
                  warning={warnings[1]}
                  hideProgressBar
                />
                <UsageRow
                  icon={CircleDollar}
                  label="Sales"
                  usage={payoutsUsage}
                  limit={payoutsLimit}
                  showNextPlan={false}
                  nextPlanLimit={undefined}
                  warning={false}
                  hideProgressBar
                  valueInCents
                />
                <UsageRow
                  icon={Users}
                  label="Partners"
                  usage={defaultProgramId ? partnersCount : 0}
                  limit={TRIAL_PARTNER_ENROLLMENT_CAP}
                  showNextPlan={false}
                  nextPlanLimit={undefined}
                  warning={false}
                  hideProgressBar
                />
              </>
            ) : (
              <>
                <UsageRow
                  icon={CursorRays}
                  label="Events"
                  usage={usage}
                  limit={usageLimit}
                  showNextPlan={hovered}
                  nextPlanLimit={nextPlan?.limits.clicks}
                  warning={warnings[0]}
                />
                <UsageRow
                  icon={Hyperlink}
                  label="Links"
                  usage={linksUsage}
                  limit={linksLimit}
                  showNextPlan={hovered}
                  nextPlanLimit={nextPlan?.limits.links}
                  warning={warnings[1]}
                />
              </>
            )}
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-500/10" />
            ) : (
              <p
                className={cn(
                  "text-xs text-neutral-900/40",
                  paymentFailedAt && "text-red-600",
                )}
              >
                {paymentFailedAt
                  ? "Your last payment failed. Please update your payment method to continue using Dub."
                  : isTrial && trialEndsAt
                    ? null
                    : billingEnd
                      ? `Usage will reset ${billingEnd}`
                      : null}
              </p>
            )}
          </div>

          {paymentFailedAt ? (
            <ManageSubscriptionButton
              text="Update Payment Method"
              variant="primary"
              className="mt-4 w-full"
              onMouseEnter={() => {
                setHovered(true);
              }}
              onMouseLeave={() => {
                setHovered(false);
              }}
            />
          ) : isTrial ? (
            <DynamicTooltipWrapper
              tooltipProps={
                permissionsError ? { content: permissionsError } : undefined
              }
            >
              <Button
                text="Activate plan"
                variant="primary"
                className="mt-4 h-8 w-full rounded-lg"
                disabled={Boolean(permissionsError)}
                onClick={() => setShowStartPaidPlanModal(true)}
                onMouseEnter={() => {
                  setHovered(true);
                }}
                onMouseLeave={() => {
                  setHovered(false);
                }}
              />
            </DynamicTooltipWrapper>
          ) : (warning || plan === "free") && plan !== "enterprise" ? (
            <Link
              href={`/${slug}/upgrade`}
              className={cn(
                buttonVariants(),
                "mt-4 flex h-9 items-center justify-center rounded-md border px-4 text-sm",
              )}
              onMouseEnter={() => {
                setHovered(true);
              }}
              onMouseLeave={() => {
                setHovered(false);
              }}
            >
              {plan === "free" ? "Get Dub Pro" : "Upgrade plan"}
            </Link>
          ) : null}
        </div>
      </AnimatedSizeContainer>
    </>
  ) : null;
}

type UsageRowProps = {
  icon: Icon;
  label: string;
  usage?: number;
  limit?: number;
  showNextPlan: boolean;
  nextPlanLimit?: number;
  warning: boolean;
  hideProgressBar?: boolean;
  valueInCents?: boolean;
};

const UsageRow = forwardRef<HTMLDivElement, UsageRowProps>(
  (
    {
      icon: Icon,
      label,
      usage,
      limit,
      showNextPlan,
      nextPlanLimit,
      warning,
      hideProgressBar = false,
      valueInCents = false,
    }: UsageRowProps,
    ref,
  ) => {
    const loading = usage === undefined || limit === undefined;
    const unlimited = limit !== undefined && limit >= INFINITY_NUMBER;

    return (
      <div ref={ref}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-neutral-600" />
            <span className="text-xs font-medium text-neutral-700">
              {label}
            </span>
          </div>
          {!loading ? (
            valueInCents ? (
              <span className="text-xs font-medium text-neutral-600">
                {formatUsdFromCents(usage!)} of {formatUsdFromCents(limit!)}
              </span>
            ) : (
              <div className="flex items-center">
                <span className="text-xs font-medium text-neutral-600">
                  <NumberFlow value={usage} /> of{" "}
                  <motion.span
                    className={cn(
                      "relative transition-colors duration-150",
                      showNextPlan && nextPlanLimit
                        ? "text-neutral-400"
                        : "text-neutral-600",
                    )}
                  >
                    {formatNumber(limit)}
                    {showNextPlan && nextPlanLimit && (
                      <motion.span
                        className="absolute bottom-[45%] left-0 h-[1px] bg-neutral-400"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                          duration: 0.25,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </motion.span>
                </span>
                <AnimatePresence>
                  {showNextPlan && nextPlanLimit && (
                    <motion.div
                      className="flex items-center"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{
                        duration: 0.25,
                        ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth movement
                      }}
                    >
                      <motion.span className="ml-1 whitespace-nowrap text-xs font-medium text-blue-600">
                        {formatNumber(nextPlanLimit)}
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          ) : (
            <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-500/10" />
          )}
        </div>
        {!hideProgressBar && !unlimited && (
          <div className="mt-1.5">
            <div
              className={cn(
                "h-0.5 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors",
                loading && "bg-neutral-900/5",
              )}
            >
              {!loading && (
                <div
                  className="animate-slide-right-fade size-full"
                  style={{ "--offset": "-100%" } as CSSProperties}
                >
                  <div
                    className={cn(
                      "size-full rounded-full bg-gradient-to-r from-transparent to-blue-600",
                      warning && "to-rose-500",
                    )}
                    style={{
                      transform: `translateX(-${100 - Math.max(Math.floor((usage! / Math.max(0, usage!, limit!)) * 100), usage === 0 ? 0 : 1)}%)`,
                      transition: "transform 0.25s ease-in-out",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

const formatNumber = (value: number) =>
  value >= INFINITY_NUMBER
    ? "∞"
    : nFormatter(value, {
        full: value !== undefined && value < 999,
        digits: 1,
      });

function formatUsdFromCents(cents: number) {
  if (cents >= INFINITY_NUMBER) {
    return "∞";
  }
  const dollars = cents / 100;
  return `$${nFormatter(dollars, {
    full: dollars < 1000,
    digits: 1,
  })}`;
}
