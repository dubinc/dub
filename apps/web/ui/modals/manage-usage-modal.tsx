import { clientAccessCheck } from "@/lib/client-access-check";
import { isEligibleForTrial } from "@/lib/stripe/is-eligible-for-trial";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  Badge,
  CursorRays,
  Hyperlink,
  Modal,
  Slider,
  ToggleGroup,
} from "@dub/ui";
import {
  DUB_TRIAL_PERIOD_DAYS,
  ENTERPRISE_PLAN,
  PlanPeriod,
  SELF_SERVE_PAID_PLANS,
  capitalize,
  cn,
  getMonthlyLimitFromPeriod,
  getPlanLimitForPeriod,
  getPlanPeriodSuffix,
  getSuggestedPlan,
  isDowngradePlan,
} from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { UpgradePlanButton } from "../workspaces/upgrade-plan-button";

type ManageUsageModalProps = {
  type: "links" | "events";
  showManageUsageModal: boolean;
  setShowManageUsageModal: Dispatch<SetStateAction<boolean>>;
};

function ManageUsageModalContent({ type }: ManageUsageModalProps) {
  const { data: session } = useSession();
  const workspace = useWorkspace();
  const { slug, role, plan, planPeriod, planTier, usageLimit, linksLimit } =
    workspace;

  const { error: permissionsError } = clientAccessCheck({
    action: "billing.write",
    role,
  });

  const usageSteps = useMemo(() => {
    const limitKey = { events: "clicks" }[type] ?? type;

    return [
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
    ];
  }, [type]);

  const defaultValue = useMemo(() => {
    const currentLimit =
      workspace[{ events: "usageLimit", links: "linksLimit" }[type]];
    const monthlyCurrentLimit = getMonthlyLimitFromPeriod({
      limit: currentLimit,
      planPeriod,
    });

    return usageSteps.reduce((prev, curr) =>
      Math.abs(curr - monthlyCurrentLimit) <
      Math.abs(prev - monthlyCurrentLimit)
        ? curr
        : prev,
    );
  }, [usageSteps, workspace, type, planPeriod]);

  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [period, setPeriod] = useState<PlanPeriod>(
    planPeriod === "yearly" ? "yearly" : "monthly",
  );

  const monthlySelectedValue = selectedValue ?? defaultValue;

  const getLimitInPeriod = useCallback(
    ({
      limit,
      storedPeriod,
      targetPeriod,
    }: {
      limit: number;
      storedPeriod?: string | null;
      targetPeriod: PlanPeriod;
    }) => {
      return getPlanLimitForPeriod({
        limit: getMonthlyLimitFromPeriod({
          limit,
          planPeriod: storedPeriod,
        }),
        planPeriod: targetPeriod,
      });
    },
    [],
  );

  const { plan: suggestedPlan, planTier: suggestedPlanTier } = getSuggestedPlan(
    {
      [type]: monthlySelectedValue,
    },
  );

  const isCurrentPlanAndPeriod =
    plan === suggestedPlan.name.toLowerCase() &&
    planPeriod === period &&
    suggestedPlanTier === (planTier ?? 1);

  const isDowngradeSuggested =
    plan &&
    isDowngradePlan({
      currentPlan: plan,
      newPlan: suggestedPlan.name,
      currentTier: planTier ?? 1,
      newTier: suggestedPlanTier,
    });

  if (usageSteps.length < 2) return null;

  return (
    <div className="bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white px-5 py-6">
        <h3 className="text-lg font-medium leading-none">Manage {type}</h3>
      </div>

      <div className="px-5 py-6">
        <p className="text-content-default text-sm font-medium">
          {
            {
              events: `Events tracked per ${period === "yearly" ? "year" : "month"}`,
              links: `Links created per ${period === "yearly" ? "year" : "month"}`,
            }[type]
          }
        </p>
        <NumberFlow
          value={getPlanLimitForPeriod({
            limit: monthlySelectedValue,
            planPeriod: period,
          })}
          className="text-content-emphasis mb-4 text-lg font-semibold"
        />

        <Slider
          value={usageSteps.indexOf(monthlySelectedValue)}
          min={0}
          max={usageSteps.length - 1}
          onChange={(idx) => setSelectedValue(usageSteps[idx])}
          marks={usageSteps.map((_, idx) => idx)}
        />

        <div className="mt-6">
          <ToggleGroup
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: "Yearly",
                badge: (
                  <Badge variant="blueGradient" className="py-0 text-xs">
                    10% discount + 12x usage upfront
                  </Badge>
                ),
              },
            ]}
            className="flex overflow-hidden rounded-lg bg-transparent p-0.5"
            indicatorClassName="rounded-md bg-white shadow-md"
            optionClassName="text-xs py-2 px-5 normal-case grow justify-center text-center"
            selected={period}
            selectAction={(period) => setPeriod(period as "monthly" | "yearly")}
          />

          <div className="border-border-subtle bg-bg-default mt-3 flex flex-col gap-5 rounded-xl border p-4 shadow-sm">
            <div>
              <span className="text-content-emphasis block text-xl font-semibold">
                {suggestedPlan.name}
              </span>
              <div className="relative flex items-center gap-1">
                {!suggestedPlan.price[period] ? (
                  <span className="pb-px text-sm font-medium text-neutral-900">
                    Custom
                  </span>
                ) : (
                  <>
                    <NumberFlow
                      value={suggestedPlan.price[period]!}
                      className="text-sm font-medium tabular-nums text-neutral-700"
                      format={{
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                      }}
                      continuous
                    />
                    <span className="text-sm font-medium text-neutral-400">
                      per month
                      {period === "yearly" && ", billed yearly"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {suggestedPlan.name === "Enterprise" ? (
              <Link
                href="https://dub.co/contact/sales"
                target="_blank"
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-lg text-center text-sm transition-all duration-200 ease-in-out",
                  "hover:ring-border-subtle border border-black bg-black text-white shadow-sm hover:ring-4",
                )}
              >
                Contact us
              </Link>
            ) : (
              <UpgradePlanButton
                plan={suggestedPlan.name.toLowerCase()}
                tier={suggestedPlanTier}
                period={period}
                disabled={isCurrentPlanAndPeriod}
                disabledTooltip={permissionsError || undefined}
                text={
                  isCurrentPlanAndPeriod
                    ? "Current plan"
                    : isDowngradeSuggested
                      ? "Downgrade"
                      : planPeriod && planPeriod !== period
                        ? `Switch to ${suggestedPlan.name} ${capitalize(period)}`
                        : isEligibleForTrial({ workspace, session })
                          ? `Start ${DUB_TRIAL_PERIOD_DAYS}-day trial`
                          : `Upgrade to ${suggestedPlan.name} ${capitalize(period)}`
                }
                variant={isDowngradeSuggested ? "secondary" : "primary"}
                className="h-8 rounded-lg shadow-sm"
              />
            )}

            <div className="flex flex-col gap-2.5">
              {[
                {
                  icon: CursorRays,
                  value: getPlanLimitForPeriod({
                    limit: suggestedPlan.limits.clicks,
                    planPeriod: period,
                  }),
                  label: `total tracked events${getPlanPeriodSuffix({ planPeriod: period })}`,
                  difference:
                    getPlanLimitForPeriod({
                      limit: suggestedPlan.limits.clicks,
                      planPeriod: period,
                    }) -
                    getLimitInPeriod({
                      limit: usageLimit ?? 0,
                      storedPeriod: planPeriod,
                      targetPeriod: period,
                    }),
                },
                {
                  icon: Hyperlink,
                  value: getPlanLimitForPeriod({
                    limit: suggestedPlan.limits.links,
                    planPeriod: period,
                  }),
                  label: `new links${getPlanPeriodSuffix({ planPeriod: period })}`,
                  difference:
                    getPlanLimitForPeriod({
                      limit: suggestedPlan.limits.links,
                      planPeriod: period,
                    }) -
                    getLimitInPeriod({
                      limit: linksLimit ?? 0,
                      storedPeriod: planPeriod,
                      targetPeriod: period,
                    }),
                },
              ].map(({ icon: Icon, value, label, difference }) => (
                <div
                  key={label}
                  className="text-content-default flex items-center gap-2 text-sm"
                >
                  <Icon
                    className={cn("size-4", difference > 0 && "text-blue-600")}
                  />
                  <span>
                    <NumberFlow
                      value={value}
                      className="tabular-nums"
                      format={{
                        notation: "compact",
                      }}
                      continuous
                    />{" "}
                    {label}
                  </span>
                  {difference !== 0 && (
                    <span
                      className={cn(
                        "flex h-[18px] items-center rounded-full px-1.5 text-[0.5rem] font-semibold uppercase leading-none",
                        difference > 0
                          ? "bg-blue-100 text-blue-600"
                          : "text-content-default bg-bg-subtle",
                      )}
                    >
                      {difference > 0 ? "Increases" : "Decreases"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href={`/${slug}/settings/billing/upgrade`}
              className="text-content-subtle hover:text-content-default block text-xs font-medium underline underline-offset-2"
            >
              View all plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageUsageModal(props: ManageUsageModalProps) {
  return (
    <Modal
      showModal={props.showManageUsageModal}
      setShowModal={props.setShowManageUsageModal}
    >
      <ManageUsageModalContent {...props} />
    </Modal>
  );
}

export function useManageUsageModal(
  props: Omit<
    ManageUsageModalProps,
    "showManageUsageModal" | "setShowManageUsageModal"
  >,
) {
  const [showManageUsageModal, setShowManageUsageModal] = useState(false);

  const ManageUsageModalCallback = useCallback(() => {
    return (
      <ManageUsageModal
        showManageUsageModal={showManageUsageModal}
        setShowManageUsageModal={setShowManageUsageModal}
        {...props}
      />
    );
  }, [showManageUsageModal, setShowManageUsageModal]);

  return useMemo(
    () => ({
      setShowManageUsageModal,
      ManageUsageModal: ManageUsageModalCallback,
    }),
    [setShowManageUsageModal, ManageUsageModalCallback],
  );
}
