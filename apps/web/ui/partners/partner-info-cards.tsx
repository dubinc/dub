import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  AdminNetworkPartner,
  EnrolledPartnerExtendedProps,
  NetworkPartnerProps,
} from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { usePartnerGroupHistorySheet } from "@/ui/activity-logs/partner-group-history-sheet";
import { CopyButton, InfoTooltip, TimestampTooltip } from "@dub/ui";
import { Fragment, ReactNode } from "react";
import { PartnerApplicationRiskSummary } from "./fraud-risks/partner-application-risk-summary";
import {
  PartnerApplicationRiskBanner,
  PartnerRiskBanner,
} from "./fraud-risks/partner-risk-banner";
import { PartnerRiskIndicator } from "./fraud-risks/partner-risk-indicator";
import { PartnerAvatar } from "./partner-avatar";
import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { monthlyTrafficAmountsMap } from "@/lib/partners/partner-profile";
import { getBasicFields } from "./partner-basic-fields";
import { PartnerInfoRewardsCard } from "./partner-info-rewards-card";
import { PartnerInfoTagsCard } from "./partner-info-tags-card";
import { PartnerNetworkStatusBadge } from "./partner-network/partner-network-status-badge";
import { PartnerStarButton } from "./partner-star-button";
import { PartnerStatusBadgeWithTooltip } from "./partner-status-badge-with-tooltip";

type PartnerInfoCardsProps = {
  showFraudIndicator?: boolean;
  showApplicationRiskAnalysis?: boolean;
  controls?: ReactNode;

  /** Partner statuses to hide badges for */
  hideStatuses?: EnrolledPartnerExtendedProps["status"][];

  // Only used for a controlled group selector that doesn't persist the selection itself
  selectedGroupId?: string | null;
  setSelectedGroupId?: (groupId: string) => void;

  /**
   * Network-browse (marketplace) mode: partner isn't enrolled, so hide the
   * group/rewards/bounties block and show website & socials in the sidebar instead.
   */
  browseMode?: boolean;
} & (
  | { type?: "enrolled"; partner?: EnrolledPartnerExtendedProps }
  | { type: "network"; partner?: NetworkPartnerProps }
  | { type: "admin"; partner?: AdminNetworkPartner }
);

export function PartnerInfoCards({
  type,
  partner,
  controls,
  hideStatuses = [],
  selectedGroupId,
  setSelectedGroupId,
  showFraudIndicator = true,
  showApplicationRiskAnalysis = false,
  browseMode = false,
}: PartnerInfoCardsProps) {
  const { id: workspaceId, slug: workspaceSlug, plan } = useWorkspace();

  const { canCreateReferralReward } = getPlanCapabilities(plan);

  const isEnrolled = type === "enrolled" || type === undefined;
  const isNetwork = type === "network";
  const isAdmin = type === "admin";

  const {
    partnerGroupHistorySheet,
    setIsOpen: setGroupHistoryOpen,
    hasActivityLogs,
  } = usePartnerGroupHistorySheet({ partner: partner || null });

  const { group } = useGroup(
    {
      groupIdOrSlug: partner
        ? selectedGroupId ||
          ("groupId" in partner ? partner.groupId : null) ||
          DEFAULT_PARTNER_GROUP.slug
        : undefined,
    },
    { keepPreviousData: false },
  );

  const basicFields = getBasicFields({
    partner,
    isEnrolled,
    isAdmin,
    isNetwork,
    canCreateReferralReward,
  });

  // Browse mode: website/socials rendered as compact rows (matching the detail
  // rows above) instead of the bordered platform cards.
  const socialFields =
    browseMode && partner && "platforms" in partner
      ? PARTNER_PLATFORM_FIELDS.map((field) => ({
          label: field.label,
          icon: field.icon,
          ...field.data(partner.platforms),
        })).filter((field) => field.value && field.href)
      : [];

  // Browse mode: description + monthly traffic move into the sidebar profile card.
  const description =
    browseMode && partner && "description" in partner
      ? partner.description
      : null;
  const monthlyTrafficLabel =
    browseMode &&
    partner &&
    "monthlyTraffic" in partner &&
    partner.monthlyTraffic
      ? (monthlyTrafficAmountsMap[partner.monthlyTraffic]?.label ?? null)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl bg-red-100">
        {partner &&
          isEnrolled &&
          (partner.status === "pending" ? (
            <PartnerApplicationRiskBanner partner={partner} />
          ) : (
            <PartnerRiskBanner partner={partner} />
          ))}

        <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="relative w-fit shrink-0">
                {partner ? (
                  <PartnerAvatar
                    partner={partner}
                    className="size-20 border border-neutral-100"
                  />
                ) : (
                  <div className="size-20 animate-pulse rounded-full bg-neutral-200" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEnrolled &&
                  partner &&
                  !hideStatuses.includes(partner.status) && (
                    <PartnerStatusBadgeWithTooltip partner={partner} />
                  )}

                {isNetwork && partner && (
                  <PartnerStarButton partner={partner} className="size-9" />
                )}

                {controls}
              </div>
            </div>

            <div className="mt-4">
              {partner ? (
                <div className="flex items-center gap-2">
                  <span className="text-content-emphasis text-lg font-semibold">
                    {partner.name}
                  </span>

                  {"networkStatus" in partner && partner.networkStatus && (
                    <PartnerNetworkStatusBadge
                      networkStatus={partner.networkStatus}
                      size="large"
                    />
                  )}

                  {showFraudIndicator && (
                    <PartnerRiskIndicator partnerId={partner.id} />
                  )}
                </div>
              ) : (
                <div className="h-7 w-24 animate-pulse rounded bg-neutral-200" />
              )}
            </div>

            {(isEnrolled || isAdmin) &&
              (partner ? (
                partner.email && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-sm font-medium text-neutral-500">
                      {partner.email}
                    </span>
                    <CopyButton
                      value={partner.email}
                      variant="neutral"
                      className="p-1 [&>*]:h-3 [&>*]:w-3"
                      successMessage="Copied email to clipboard!"
                    />
                  </div>
                )
              ) : (
                <div className="mt-0.5 h-5 w-32 animate-pulse rounded bg-neutral-200" />
              ))}
          </div>

          <div className="flex flex-col gap-2 p-4">
            {basicFields
              .filter(({ text }) => text !== null)
              .map(({ id, icon, text, timestamp, wrapper: RowWrapper }) => {
                const rowInner = (
                  <div className="text-content-subtle flex items-center gap-1">
                    {text !== undefined ? (
                      <>
                        {icon}
                        {typeof text === "string" ? (
                          <span className="text-xs font-medium">{text}</span>
                        ) : (
                          <div className="text-xs font-medium">{text}</div>
                        )}
                      </>
                    ) : (
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                    )}
                  </div>
                );
                const withTimestamp =
                  timestamp != null ? (
                    <TimestampTooltip
                      timestamp={timestamp}
                      rows={["local", "utc", "unix"]}
                      side="left"
                      delayDuration={250}
                    >
                      {rowInner}
                    </TimestampTooltip>
                  ) : (
                    rowInner
                  );
                return (
                  <Fragment key={id}>
                    {RowWrapper ? (
                      <RowWrapper>{withTimestamp}</RowWrapper>
                    ) : (
                      withTimestamp
                    )}
                  </Fragment>
                );
              })}
          </div>

          {description && (
            <div className="flex flex-col gap-1.5 p-4">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                About
              </h3>
              <p className="text-content-default line-clamp-4 text-xs leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {socialFields.length > 0 && (
            <div className="flex flex-col gap-2.5 p-4">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                Website and socials
              </h3>
              <div className="flex flex-col gap-2.5">
                {socialFields.map(({ label, icon: Icon, value, href, info }) => (
                  <a
                    key={label}
                    href={href ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-content-subtle hover:text-content-default flex items-start gap-1.5 transition-colors"
                  >
                    <Icon className="size-3.5 shrink-0 translate-y-px" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{value}</div>
                      {info && info.length > 0 && (
                        <div className="text-content-muted truncate text-[11px] font-medium">
                          {info.join(" · ")}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {monthlyTrafficLabel && (
            <div className="flex flex-col gap-1.5 p-4">
              <div className="flex items-center gap-1">
                <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                  Monthly traffic
                </h3>
                <InfoTooltip content="Shared by the partner, not verified by Dub." />
              </div>
              <span className="text-content-default text-xs font-medium">
                {monthlyTrafficLabel}
              </span>
            </div>
          )}
          {isEnrolled && partner && <PartnerInfoTagsCard partner={partner} />}

          {partner && isEnrolled && showApplicationRiskAnalysis && (
            <PartnerApplicationRiskSummary partner={partner} />
          )}
        </div>
      </div>

      {!isAdmin && !browseMode && (
        <PartnerInfoRewardsCard
          partner={partner}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          isEnrolled={isEnrolled}
          group={group}
          partnerGroupHistorySheet={partnerGroupHistorySheet}
          setGroupHistoryOpen={setGroupHistoryOpen}
          hasActivityLogs={hasActivityLogs}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
        />
      )}
    </div>
  );
}
