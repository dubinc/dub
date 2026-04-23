import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BountyListProps,
  EnrolledPartnerExtendedProps,
  NetworkPartnerProps,
  RewardProps,
} from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { usePartnerGroupHistorySheet } from "@/ui/activity-logs/partner-group-history-sheet";
import {
  Button,
  CalendarIcon,
  CopyButton,
  Globe,
  Heart,
  OfficeBuilding,
  TimestampTooltip,
  Trophy,
} from "@dub/ui";
import { TriangleWarning, Users, VerifiedBadge } from "@dub/ui/icons";
import {
  COUNTRIES,
  fetcher,
  formatDate,
  formatDateTimeSmart,
} from "@dub/utils";
import { CircleMinus } from "lucide-react";
import Link from "next/link";
import { Fragment, ReactNode, createElement } from "react";
import useSWR from "swr";
import { useEditPartnerTagsModal } from "./edit-partner-tags-modal";
import { PartnerApplicationRiskSummary } from "./fraud-risks/partner-application-risk-summary";
import {
  PartnerApplicationFraudBanner,
  PartnerFraudBanner,
} from "./fraud-risks/partner-fraud-banner";
import { PartnerFraudIndicator } from "./fraud-risks/partner-fraud-indicator";
import { PartnerAvatar } from "./partner-avatar";
import { PartnerInfoGroup } from "./partner-info-group";
import { PartnerStarButton } from "./partner-star-button";
import { PartnerStatusBadgeWithTooltip } from "./partner-status-badge-with-tooltip";
import { PartnerTagsList } from "./partner-tags-list";
import {
  getPayoutMethodIconConfig,
  getPayoutMethodLabel,
} from "./payouts/payout-method-config";
import { ProgramRewardList } from "./program-reward-list";
import { TrustedPartnerBadge } from "./trusted-partner-badge";

type PartnerInfoCardsProps = {
  showFraudIndicator?: boolean;
  showApplicationRiskAnalysis?: boolean;
  controls?: ReactNode;

  /** Partner statuses to hide badges for */
  hideStatuses?: EnrolledPartnerExtendedProps["status"][];

  // Only used for a controlled group selector that doesn't persist the selection itself
  selectedGroupId?: string | null;
  setSelectedGroupId?: (groupId: string) => void;
} & (
  | { type?: "enrolled"; partner?: EnrolledPartnerExtendedProps }
  | { type: "network"; partner?: NetworkPartnerProps }
);

type BasicField = {
  id: string;
  icon: React.ReactElement;
  text: string | null | undefined;
  /** When set, the row is wrapped in TimestampTooltip (local / UTC / unix). */
  timestamp?: Date | string | number;
  /** Optional outer wrapper (e.g. ConversionScoreTooltip) around the row content. */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
};

export function PartnerInfoCards({
  type,
  partner,
  controls,
  hideStatuses = [],
  selectedGroupId,
  setSelectedGroupId,
  showFraudIndicator = true,
  showApplicationRiskAnalysis = false,
}: PartnerInfoCardsProps) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { program } = useProgram();

  const isEnrolled = type === "enrolled" || type === undefined;
  const isNetwork = type === "network";

  const showPayoutMethodField =
    isEnrolled && program?.payoutMode !== "external";

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

  const { data: bounties, error: errorBounties } = useSWR<BountyListProps[]>(
    workspaceId && partner && isEnrolled
      ? `/api/bounties?workspaceId=${workspaceId}&partnerId=${partner.id}`
      : null,
    fetcher,
  );

  let basicFields: BasicField[] = [
    {
      id: "country",
      icon: partner?.country ? (
        <img
          alt={`Flag of ${COUNTRIES[partner.country]}`}
          src={`https://flag.vercel.app/m/${partner.country}.svg`}
          className="size-3.5 rounded-full"
        />
      ) : (
        <Globe className="size-3.5 shrink-0" />
      ),
      text: partner?.country ? COUNTRIES[partner.country] : "Planet Earth",
    },
    {
      id: "companyName",
      icon: <OfficeBuilding className="size-3.5" />,
      text: partner ? partner.companyName || null : undefined,
    },
  ];

  if (isEnrolled && partner) {
    basicFields = basicFields.concat([
      {
        id: "createdAt",
        icon: <Users className="size-3.5" />,
        text: `${partner.status === "approved" ? "Partner since" : "Applied"} ${formatDate(partner.createdAt)}`,
        timestamp: partner.createdAt,
      },
      ...(showPayoutMethodField
        ? [
            {
              id: "payoutMethod" as const,
              icon: partner.defaultPayoutMethod ? (
                createElement(
                  getPayoutMethodIconConfig(partner.defaultPayoutMethod).Icon,
                  { className: "size-3.5 shrink-0" },
                )
              ) : (
                <CircleMinus className="size-3.5 shrink-0" />
              ),
              text:
                partner.defaultPayoutMethod && partner.payoutsEnabledAt
                  ? `${getPayoutMethodLabel(partner.defaultPayoutMethod)} connected ${formatDateTimeSmart(partner.payoutsEnabledAt)}`
                  : "No payout method connected",
              ...(partner.payoutsEnabledAt
                ? { timestamp: partner.payoutsEnabledAt }
                : {}),
            },
          ]
        : []),
      // TODO: once more partners verify their identity, we can show this by default
      ...(partner.identityVerifiedAt
        ? [
            {
              id: "identityVerifiedAt",
              icon: partner.identityVerifiedAt ? (
                <VerifiedBadge className="size-3.5 shrink-0" />
              ) : (
                <TriangleWarning className="size-3.5 shrink-0" />
              ),
              text: partner.identityVerifiedAt
                ? `Identity verified ${formatDate(partner.identityVerifiedAt, { month: "short" })}`
                : "Identity not verified",
              ...(partner.identityVerifiedAt
                ? { timestamp: partner.identityVerifiedAt }
                : {}),
            },
          ]
        : []),
    ]);
  }

  if (isNetwork) {
    basicFields = basicFields.concat([
      {
        id: "joinedAt",
        icon: <CalendarIcon className="size-3.5" />,
        text: partner ? `Joined ${formatDate(partner.createdAt!)}` : undefined,
        timestamp: partner?.createdAt,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl bg-red-100">
        {partner &&
          isEnrolled &&
          (partner.status === "pending" ? (
            <PartnerApplicationFraudBanner partner={partner} />
          ) : (
            <PartnerFraudBanner partner={partner} />
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
                {partner?.trustedAt && <TrustedPartnerBadge />}
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

                  {showFraudIndicator && (
                    <PartnerFraudIndicator partnerId={partner.id} />
                  )}
                </div>
              ) : (
                <div className="h-7 w-24 animate-pulse rounded bg-neutral-200" />
              )}
            </div>

            {isEnrolled &&
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
                        <span className="text-xs font-medium">{text}</span>
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
          {isEnrolled && partner && <TagsList partner={partner} />}

          {partner && isEnrolled && showApplicationRiskAnalysis && (
            <PartnerApplicationRiskSummary partner={partner} />
          )}
        </div>
      </div>

      <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-4">
        {/* Group */}
        <div className="flex flex-col gap-2">
          {isEnrolled && (
            <div className="flex min-h-7 items-center justify-between">
              <h3 className="text-content-emphasis text-sm font-semibold">
                Group
              </h3>

              {partner && partner.status !== "pending" && hasActivityLogs && (
                <Button
                  variant="outline"
                  text="View history"
                  className="h-7 w-fit rounded-lg px-1.5 text-xs font-medium text-neutral-400"
                  onClick={() => setGroupHistoryOpen(true)}
                />
              )}
            </div>
          )}

          {partnerGroupHistorySheet}
          {partner ? (
            <PartnerInfoGroup
              partner={partner}
              changeButtonText="Change"
              hideChangeButton={
                "status" in partner &&
                INACTIVE_ENROLLMENT_STATUSES.includes(partner.status)
              }
              className="rounded-lg bg-white shadow-sm"
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
            />
          ) : (
            <div className="my-px h-11 w-full animate-pulse rounded-lg bg-neutral-200" />
          )}
        </div>

        {isEnrolled && partner?.status === "approved" && (
          <>
            {/* Rewards */}
            <div className="flex flex-col gap-2">
              <h3 className="text-content-emphasis text-sm font-semibold">
                Rewards
              </h3>
              {group ? (
                group.clickReward ||
                group.leadReward ||
                group.saleReward ||
                group.discount ? (
                  <ProgramRewardList
                    rewards={[
                      group.clickReward,
                      group.leadReward,
                      group.saleReward,
                    ].filter((r): r is RewardProps => r !== null)}
                    discount={group.discount}
                    variant="plain"
                    className="text-content-subtle gap-2 text-xs leading-4"
                    iconClassName="size-3.5"
                  />
                ) : (
                  <span className="text-content-subtle text-xs">
                    No rewards
                  </span>
                )
              ) : (
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
              )}
            </div>
            {/* Eligible bounties */}
            <div className="flex flex-col gap-2">
              <h3 className="text-content-emphasis text-sm font-semibold">
                Eligible Bounties
              </h3>
              {bounties ? (
                bounties.length ? (
                  <div className="flex flex-col gap-2">
                    {bounties.map((bounty) => {
                      const Icon =
                        bounty.type === "performance" ? Trophy : Heart;
                      return (
                        <Link
                          key={bounty.id}
                          target="_blank"
                          href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
                          className="text-content-subtle flex cursor-alias items-center gap-2 decoration-dotted underline-offset-2 hover:underline"
                        >
                          <Icon className="size-3.5 shrink-0" />
                          <span className="text-xs font-medium">
                            {bounty.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-content-subtle text-xs">
                    No eligible bounties
                  </p>
                )
              ) : errorBounties ? (
                <p className="text-content-subtle text-xs">
                  Failed to load bounties
                </p>
              ) : (
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TagsList({ partner }: { partner: EnrolledPartnerExtendedProps }) {
  const { EditPartnerTagsModal, setShowEditPartnerTagsModal } =
    useEditPartnerTagsModal({
      partners: [partner],
    });

  return (
    <div className="border-border-subtle flex flex-col border-t p-4">
      <EditPartnerTagsModal />
      <div className="mb-2 flex justify-between gap-2">
        <span className="text-content-emphasis block text-xs font-semibold">
          Tags
        </span>

        <button
          type="button"
          onClick={() => setShowEditPartnerTagsModal(true)}
          className="text-content-subtle hover:text-content-default text-xs font-medium"
        >
          Manage
        </button>
      </div>
      <PartnerTagsList
        tags={partner?.tags}
        wrap
        onAddTag={() => setShowEditPartnerTagsModal(true)}
        mode="link"
      />
    </div>
  );
}
