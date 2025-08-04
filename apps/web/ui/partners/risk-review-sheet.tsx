import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudEvent } from "@/lib/types";
import {
  FRAUD_EVENT_RESOLUTION_REASONS,
  FRAUD_EVENT_TYPES,
} from "@/lib/zod/schemas/fraud-events";
import { X } from "@/ui/shared/icons";
import {
  Button,
  Popover,
  Sheet,
  TabSelect,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import {
  cn,
  currencyFormatter,
  formatDate,
  formatDateTime,
  nFormatter,
  OG_AVATAR_URL,
  pluralize,
} from "@dub/utils";
import { ChevronDown, Flag, Mail } from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { CustomerRowItem } from "../customers/customer-row-item";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { FraudEventStatusBadges } from "./fraud-event-status-badges";
import { useMarkFraudEventBannedModal } from "./mark-fraud-event-banned-modal";
import { useMarkFraudEventSafeModal } from "./mark-fraud-event-safe-modal";
import { PartnerInfoSection } from "./partner-info-section";

interface RiskReviewSheetProps {
  fraudEvent: FraudEvent;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type Tab = "details" | "history";

function RiskReviewSheetContent({ fraudEvent }: RiskReviewSheetProps) {
  const [tab, setTab] = useState<Tab>("details");
  const [isOpen, setIsOpen] = useState(false);

  const { partner, loading: isLoadingPartner } = usePartner({
    partnerId: fraudEvent.partner.id,
  });

  const { setShowModal: setShowSafeModal, MarkFraudEventSafeModal } =
    useMarkFraudEventSafeModal({
      fraudEvent,
    });

  const { setShowModal: setShowBanModal, MarkFraudEventBannedModal } =
    useMarkFraudEventBannedModal({
      fraudEvent,
    });

  const BanIcon = FraudEventStatusBadges["banned"].icon;

  return (
    <>
      <MarkFraudEventSafeModal />
      <MarkFraudEventBannedModal />
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="flex h-16 items-center justify-between px-6 py-4">
            <Sheet.Title className="text-lg font-semibold">
              Risk review
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="flex grow flex-col">
          <div className="border-b border-neutral-200 bg-neutral-50 p-6">
            {isLoadingPartner ? (
              <div className="flex min-h-[80px] items-start justify-between gap-6">
                <div>
                  <div className="relative w-fit">
                    <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
                    <div className="absolute -right-1 top-0 size-3 animate-pulse rounded-full bg-neutral-200" />
                  </div>
                  <div className="mt-4 flex items-start gap-2">
                    <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
                    <div className="h-5 w-16 animate-pulse rounded bg-neutral-200" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                    <div className="size-4 animate-pulse rounded bg-neutral-200" />
                  </div>
                </div>
                <div />
              </div>
            ) : (
              partner && <PartnerInfoSection partner={partner} />
            )}

            {isLoadingPartner ? (
              <div className="xs:grid-cols-3 mt-6 grid min-h-[120px] grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col bg-neutral-50 p-3">
                    <div className="h-3 w-12 animate-pulse rounded bg-neutral-200" />
                    <div className="mt-1 h-5 w-16 animate-pulse rounded bg-neutral-200" />
                  </div>
                ))}
              </div>
            ) : (
              partner && (
                <div className="xs:grid-cols-3 mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
                  {[
                    [
                      "Clicks",
                      !partner.clicks
                        ? "-"
                        : nFormatter(partner.clicks, { full: true }),
                    ],
                    [
                      "Leads",
                      !partner.leads
                        ? "-"
                        : nFormatter(partner.leads, { full: true }),
                    ],
                    [
                      "Sales",
                      !partner.sales
                        ? "-"
                        : nFormatter(partner.sales, { full: true }),
                    ],
                    [
                      "Revenue",
                      !partner.saleAmount
                        ? "-"
                        : currencyFormatter(partner.saleAmount / 100, {
                            minimumFractionDigits:
                              partner.saleAmount % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          }),
                    ],
                    [
                      "Commissions",
                      !partner.totalCommissions
                        ? "-"
                        : currencyFormatter(partner.totalCommissions / 100, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }),
                    ],
                    [
                      "Net revenue",
                      !partner.netRevenue
                        ? "-"
                        : currencyFormatter(partner.netRevenue / 100, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col bg-neutral-50 p-3"
                    >
                      <span className="text-xs text-neutral-500">{label}</span>
                      <span className="text-base text-neutral-900">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="-mb-6 mt-2 flex items-center gap-2">
              <TabSelect
                options={[
                  { id: "details", label: "For review" },
                  { id: "history", label: "History" },
                ]}
                selected={tab}
                onSelect={(id: Tab) => {
                  setTab(id);
                }}
              />
            </div>
          </div>

          <div className="grow overflow-y-auto p-6">
            <>
              {tab === "details" && <FraudEventCard fraudEvent={fraudEvent} />}
              {tab === "history" && (
                <FraudEventHistory partnerId={fraudEvent.partner.id} />
              )}
            </>
          </div>

          {tab === "details" && (
            <div className="flex grow flex-col justify-end">
              <div className="border-t border-neutral-200 p-5">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    text="Mark event as safe"
                    disabled={fraudEvent.status === "safe"}
                    disabledTooltip={
                      fraudEvent.status === "safe"
                        ? "This event is already marked as safe."
                        : undefined
                    }
                    onClick={() => {
                      setShowSafeModal(true);
                    }}
                  />

                  <Popover
                    content={
                      <div className="w-full md:w-56">
                        <div className="grid gap-px p-2">
                          <Button
                            onClick={() => {
                              setIsOpen(false);
                              window.open(
                                `mailto:${fraudEvent.partner.email}?subject=Question about fraud event`,
                                "_blank",
                              );
                            }}
                            variant="outline"
                            className="w-full justify-start"
                            icon={<Mail className="h-4 w-4 text-neutral-500" />}
                            text="Reach out to partner"
                          />

                          <Button
                            onClick={() => {
                              setIsOpen(false);
                              setShowBanModal(true);
                            }}
                            variant="outline"
                            className="w-full justify-start"
                            icon={<BanIcon className="h-4 w-4 text-red-600" />}
                            text="Ban partner"
                            disabled={fraudEvent.status === "banned"}
                            disabledTooltip={
                              fraudEvent.status === "banned"
                                ? "Partner is already banned."
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    }
                    openPopover={isOpen}
                    setOpenPopover={setIsOpen}
                    align="end"
                  >
                    <Button
                      onClick={() => setIsOpen(!isOpen)}
                      variant="danger"
                      text="Take action"
                      icon={<ChevronDown className="size-4 text-white" />}
                      className="w-fit"
                    />
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const FraudEventHistory = ({ partnerId }: { partnerId: string }) => {
  const {
    fraudEvents,
    loading: fraudEventsLoading,
    error: fraudEventsError,
  } = useFraudEvents({
    query: {
      partnerId,
      interval: "all",
    },
  });

  const resolvedFraudEvents = useMemo(
    () => fraudEvents?.filter(({ status }) => status !== "pending"),
    [fraudEvents],
  );

  if (fraudEventsLoading || !fraudEvents) {
    return <FraudEventHistorySkeleton />;
  }

  if (fraudEventsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm text-neutral-500">
            {fraudEventsError ||
              "There was an error loading the fraud event history."}
          </p>
        </div>
      </div>
    );
  }

  if (resolvedFraudEvents?.length === 0) {
    return (
      <AnimatedEmptyState
        className="md:min-h-80"
        title="No previous fraud events"
        description="When fraud events are resolved for this partner, they will appear here."
        cardContent={() => (
          <>
            <div className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
              <Flag className="size-4 text-neutral-700" />
            </div>
            <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {resolvedFraudEvents?.map((fraudEvent) => (
        <FraudEventCard key={fraudEvent.id} fraudEvent={fraudEvent} />
      ))}
    </div>
  );
};

function FraudEventCard({ fraudEvent }: { fraudEvent: FraudEvent }) {
  const { slug } = useWorkspace();

  const badge = FraudEventStatusBadges[fraudEvent.status];
  const Icon = badge.icon;
  const user = fraudEvent.user;

  const helAmount = useMemo(() => {
    return fraudEvent.commissions?.reduce(
      (acc, commission) => acc + commission.earnings,
      0,
    );
  }, [fraudEvent.commissions]);

  const fraudTypes = useMemo(() => {
    return [
      ...(fraudEvent.selfReferral
        ? [FRAUD_EVENT_TYPES["selfReferral"].label]
        : []),
      ...(fraudEvent.googleAdsClick
        ? [FRAUD_EVENT_TYPES["googleAdsClick"].label]
        : []),
      ...(fraudEvent.disposableEmail
        ? [FRAUD_EVENT_TYPES["disposableEmail"].label]
        : []),
    ];
  }, [fraudEvent]);

  const reasons: string[] = useMemo(() => {
    return fraudEvent.details
      ?.map(({ reasons }) => reasons)
      .flat()
      .filter(Boolean);
  }, [fraudEvent]);

  const parameters: Record<string, string> | undefined = useMemo(() => {
    return fraudEvent.details?.find(({ type }) => type === "googleAdsClick")
      ?.parameters;
  }, [fraudEvent]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex min-w-0 flex-1 flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex size-6 items-center justify-center gap-2 rounded-md",
              badge.className,
            )}
          >
            <Icon className="size-4" />
          </div>

          {user && (
            <Tooltip
              content={
                <div className="flex flex-col gap-1 p-2.5">
                  <div className="flex flex-col gap-2">
                    <img
                      src={user.image || `${OG_AVATAR_URL}${user.name}`}
                      alt={user.name ?? user.id}
                      className="size-6 shrink-0 rounded-full"
                    />
                    <p className="text-sm font-medium">
                      {user.name || user.id}
                    </p>
                  </div>

                  {fraudEvent.resolvedAt && (
                    <div className="text-xs text-neutral-500">
                      Resolved at{" "}
                      <span className="font-medium text-neutral-700">
                        {formatDateTime(fraudEvent.resolvedAt, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              }
              side="left"
            >
              <div className="flex items-center gap-2">
                <img
                  src={user.image || `${OG_AVATAR_URL}${user.name}`}
                  alt={user.name ?? user.id}
                  className="size-5 shrink-0 rounded-full"
                />

                {fraudEvent.resolvedAt && (
                  <span className="text-sm font-medium text-neutral-700">
                    {formatDate(fraudEvent.resolvedAt, {
                      month: "short",
                      day: "numeric",
                      year: undefined,
                    })}
                  </span>
                )}
              </div>
            </Tooltip>
          )}
        </div>

        <div className="divide-y divide-neutral-200">
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">
                {fraudTypes.join(", ")}
              </h2>
            </div>
            <span className="text-sm text-neutral-500">
              {formatDate(fraudEvent.createdAt)}
            </span>
          </div>

          <div className="space-y-4 pt-4">
            {parameters && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  Parameters used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parameters).map(([key, value]) => (
                    <div
                      className="inline-flex items-center bg-orange-50"
                      key={key}
                    >
                      <span className="text-sm font-medium text-orange-600">
                        {key}={value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-neutral-900">Link</h3>
              <div className="inline-flex items-center bg-orange-50">
                <span className="text-sm font-medium text-orange-600">
                  {fraudEvent.link.shortLink}
                </span>
              </div>
            </div>

            {fraudEvent.customer && (
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-neutral-900">
                  Customer
                </h3>
                <CustomerRowItem
                  customer={fraudEvent.customer}
                  href={`/${slug}/customers/${fraudEvent.customer.id}`}
                  avatarClassName="size-5"
                  className="text-sm font-medium leading-5 text-neutral-500"
                  showChartActivityIcon={false}
                />
              </div>
            )}

            {helAmount && helAmount > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  Commission hold
                </h3>
                <span className="text-sm font-medium text-neutral-500">
                  {currencyFormatter(helAmount / 100, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ) : null}

            {reasons && reasons.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  {pluralize("Reason", reasons.length)}
                </h3>
                <div className="text-sm text-neutral-500">
                  {reasons.map((reason, index) => (
                    <div key={index}>{reason}.</div>
                  ))}
                </div>
              </div>
            )}

            {fraudEvent.resolutionReason && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  Resolution reason
                </h3>
                <p className="text-sm text-neutral-500">
                  {FRAUD_EVENT_RESOLUTION_REASONS[fraudEvent.resolutionReason]}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FraudEventHistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex min-w-0 flex-1 flex-col space-y-4">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-red-100">
            <div className="size-3.5 animate-pulse rounded bg-red-200" />
          </div>

          <div className="divide-y divide-neutral-200">
            <div className="pb-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
                <div className="size-4 animate-pulse rounded bg-neutral-200" />
              </div>
              <div className="mt-1 h-4 w-20 animate-pulse rounded bg-neutral-200" />
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <div className="h-4 w-8 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 h-4 w-48 animate-pulse rounded bg-orange-100" />
              </div>

              <div className="space-y-0.5">
                <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div className="size-5 animate-pulse rounded-full bg-neutral-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RiskReviewSheet({
  isOpen,
  ...rest
}: RiskReviewSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() =>
        queryParams({
          del: "fraudEventId",
          scroll: false,
        })
      }
    >
      <RiskReviewSheetContent {...rest} />
    </Sheet>
  );
}
