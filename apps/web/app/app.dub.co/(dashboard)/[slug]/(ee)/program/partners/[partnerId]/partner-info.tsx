"use client";

import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BountyListProps,
  EnrolledPartnerProps,
  RewardProps,
} from "@/lib/types";
import { EventDatum } from "@/ui/analytics/events/events-table";
import { PartnerInfoGroup } from "@/ui/partners/partner-info-group";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
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
  fetcher,
  formatDate,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PartnerInfo({ partner }: { partner?: EnrolledPartnerProps }) {
  const {
    id: workspaceId,
    slug: workspaceSlug,
    defaultProgramId,
  } = useWorkspace();
  const { partnerId } = useParams() as { partnerId: string };

  const { data: eventsData, isLoading: isLoadingEvents } = useSWR<EventDatum[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/events?${new URLSearchParams({ workspaceId, programId: defaultProgramId, partnerId, interval: "all", limit: "1" })}`,
    fetcher,
  );

  const { group } = useGroup({
    groupIdOrSlug: partner?.groupId ?? undefined,
  });

  const {
    data: bounties,
    isLoading: isLoadingBounties,
    error: errorBounties,
  } = useSWR<BountyListProps[]>(
    workspaceId
      ? `/api/bounties?workspaceId=${workspaceId}&partnerId=${partnerId}`
      : null,
    fetcher,
  );

  const basicFields = [
    {
      id: "event",
      icon: <ChartActivity2 className="size-3.5" />,
      text: eventsData
        ? eventsData.length
          ? `Last event ${timeAgo(new Date(eventsData[0].timestamp), { withAgo: true })}`
          : null
        : undefined,
    },
    {
      id: "companyName",
      icon: <OfficeBuilding className="size-3.5" />,
      text: partner ? partner.companyName || null : undefined,
    },
    {
      id: "createdAt",
      icon: <CalendarIcon className="size-3.5" />,
      text: partner
        ? `Partner since ${formatDate(partner.createdAt)}`
        : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-subtle flex flex-col rounded-xl border p-4">
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
        <div className="mt-4">
          {partner ? (
            <span className="text-content-emphasis text-lg font-semibold">
              {partner.name}
            </span>
          ) : (
            <div className="h-7 w-24 animate-pulse rounded bg-neutral-200" />
          )}
        </div>
        {partner ? (
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
        )}

        <div className="mt-3 flex flex-col gap-2">
          {basicFields
            .filter(({ text }) => text !== null)
            .map(({ id, icon, text }) => (
              <div
                key={id}
                className="text-content-subtle flex items-center gap-1"
              >
                {text !== undefined ? (
                  <>
                    {icon}
                    <span className="text-xs font-medium">{text}</span>
                  </>
                ) : (
                  <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                )}
              </div>
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
            <>
              <ProgramRewardList
                rewards={sortRewardsByEventOrder(
                  [
                    group.clickReward,
                    group.leadReward,
                    group.saleReward,
                  ].filter((r): r is RewardProps => r !== null),
                )}
                discount={group.discount}
                variant="plain"
                className="text-content-subtle gap-2 text-xs leading-4"
                iconClassName="size-3.5"
              />
            </>
          ) : (
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          )}
        </div>

        {/* Eligible bounties */}
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
                      <span className="text-xs font-medium">{bounty.name}</span>
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
      </div>
    </div>
  );
}
