import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BountyListProps,
  EnrolledPartnerExtendedProps,
  NetworkPartnerProps,
  RewardProps,
} from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  CalendarIcon,
  ChartActivity2,
  CopyButton,
  Heart,
  OfficeBuilding,
  Tooltip,
  Trophy,
} from "@dub/ui";
import {
  COUNTRIES,
  OG_AVATAR_URL,
  capitalize,
  fetcher,
  formatDate,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import useSWR from "swr";
import { ConversionScoreIcon } from "./conversion-score-icon";
import { PartnerInfoGroup } from "./partner-info-group";
import { ConversionScoreTooltip } from "./partner-network/conversion-score-tooltip";
import { PartnerStatusBadgeWithTooltip } from "./partner-status-badge-with-tooltip";
import { ProgramRewardList } from "./program-reward-list";

type PartnerInfoCardsProps = {
  /** Partner statuses to hide badges for */
  hideStatuses?: EnrolledPartnerExtendedProps["status"][];

  // Only used for a controlled group selector that doesn't persist the selection itself
  selectedGroupId?: string | null;
  setSelectedGroupId?: (groupId: string) => void;
} & (
  | { type?: "enrolled"; partner?: EnrolledPartnerExtendedProps }
  | { type: "network"; partner?: NetworkPartnerProps }
);

export function PartnerInfoCards({
  type,
  partner,
  hideStatuses = [],
  selectedGroupId,
  setSelectedGroupId,
}: PartnerInfoCardsProps) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const isEnrolled = type === "enrolled" || type === undefined;
  const isNetwork = type === "network";

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
    workspaceId && partner
      ? `/api/bounties?workspaceId=${workspaceId}&partnerId=${partner.id}`
      : null,
    fetcher,
  );

  const basicFields = isEnrolled
    ? [
        ...(partner?.status === "approved"
          ? [
              {
                id: "lastLeadAt",
                icon: <ChartActivity2 className="size-3.5" />,
                text: partner.lastLeadAt
                  ? `Last lead event ${timeAgo(new Date(partner.lastLeadAt), { withAgo: true })}`
                  : null,
              },
              {
                id: "lastConversionAt",
                icon: <ChartActivity2 className="size-3.5" />,
                text: partner.lastConversionAt
                  ? `Last conversion event ${timeAgo(new Date(partner.lastConversionAt), { withAgo: true })}`
                  : null,
              },
            ]
          : []),
        {
          id: "companyName",
          icon: <OfficeBuilding className="size-3.5" />,
          text: partner ? partner.companyName || null : undefined,
        },
        {
          id: "createdAt",
          icon: <CalendarIcon className="size-3.5" />,
          text: partner
            ? `${partner.status === "approved" ? "Partner since" : "Applied"} ${formatDate(partner.createdAt)}`
            : undefined,
        },
      ]
    : isNetwork
      ? [
          {
            id: "conversion",
            icon: (
              <ConversionScoreIcon
                score={partner?.conversionScore || null}
                className="size-3.5 shrink-0"
              />
            ),
            text: partner
              ? partner.conversionScore
                ? `${capitalize(partner.conversionScore)} conversion`
                : "Unknown conversion"
              : undefined,
            wrapper: ConversionScoreTooltip,
          },
          {
            id: "lastConversionAt",
            icon: <ChartActivity2 className="size-3.5" />,
            text: partner
              ? partner.lastConversionAt
                ? `Last conversion ${timeAgo(partner.lastConversionAt, { withAgo: true })}`
                : "No conversions yet"
              : undefined,
          },
          {
            id: "companyName",
            icon: <OfficeBuilding className="size-3.5" />,
            text: partner ? partner.companyName || null : undefined,
          },
          {
            id: "joinedAt",
            icon: <CalendarIcon className="size-3.5" />,
            text: partner
              ? `Joined ${formatDate(partner.createdAt!)}`
              : undefined,
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-subtle flex flex-col rounded-xl border p-4">
        <div className="flex justify-between gap-2">
          <div className="relative w-fit">
            {partner ? (
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-20 rounded-full"
              />
            ) : (
              <div className="size-20 animate-pulse rounded-full bg-neutral-200" />
            )}
            {partner?.country && (
              <Tooltip content={COUNTRIES[partner.country]}>
                <div className="absolute right-0 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${partner.country}.svg`}
                    className="size-4 rounded-full"
                  />
                </div>
              </Tooltip>
            )}
          </div>

          {isEnrolled && partner && !hideStatuses.includes(partner.status) && (
            <PartnerStatusBadgeWithTooltip partner={partner} />
          )}
        </div>
        <div className="mt-4">
          {partner ? (
            <span className="text-content-emphasis text-lg font-semibold">
              {partner.name}
            </span>
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

        <div className="mt-3 flex flex-col gap-2">
          {basicFields
            .filter(({ text }) => text !== null)
            .map(({ id, icon, text, wrapper: Wrapper = "div" }) => (
              <Wrapper key={id}>
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
              </Wrapper>
            ))}
        </div>
      </div>

      <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-4">
        <h2 className="text-content-emphasis text-sm font-semibold">
          Organization
        </h2>

        {/* Group */}
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">Group</h3>
          {partner ? (
            <PartnerInfoGroup
              partner={partner}
              changeButtonText="Change"
              className="rounded-lg bg-white shadow-sm"
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
            />
          ) : (
            <div className="my-px h-11 w-full animate-pulse rounded-lg bg-neutral-200" />
          )}
        </div>

        {/* Rewards */}
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
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
              <span className="text-content-subtle text-xs">No rewards</span>
            )
          ) : (
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          )}
        </div>

        {/* Eligible bounties */}
        {isEnrolled && partner?.status === "approved" && (
          <div className="flex flex-col gap-2">
            <h3 className="text-content-emphasis text-xs font-semibold">
              Eligible Bounties
            </h3>
            {bounties ? (
              bounties.length ? (
                <div className="flex flex-col gap-2">
                  {bounties.map((bounty) => {
                    const Icon = bounty.type === "performance" ? Trophy : Heart;
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
        )}
      </div>
    </div>
  );
}
