"use client";

import {
  AdminNetworkPartner,
  BountyListProps,
  EnrolledPartnerExtendedProps,
  GroupProps,
  NetworkPartnerProps,
  RewardProps,
} from "@/lib/types";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { Button, Heart, Trophy } from "@dub/ui";
import { fetcher } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";
import useSWR from "swr";
import { PartnerInfoGroup } from "./partner-info-group";
import { ProgramRewardList } from "./program-reward-list";

export function PartnerInfoRewardsCard({
  partner,
  workspaceId,
  workspaceSlug,
  isEnrolled,
  group,
  partnerGroupHistorySheet,
  setGroupHistoryOpen,
  hasActivityLogs,
  selectedGroupId,
  setSelectedGroupId,
}: {
  partner?:
    | EnrolledPartnerExtendedProps
    | NetworkPartnerProps
    | AdminNetworkPartner;
  workspaceId?: string;
  workspaceSlug?: string;
  isEnrolled: boolean;
  group?: GroupProps;
  partnerGroupHistorySheet: ReactNode;
  setGroupHistoryOpen: (open: boolean) => void;
  hasActivityLogs: boolean;
  selectedGroupId?: string | null;
  setSelectedGroupId?: (groupId: string) => void;
}) {
  const { data: bounties, error: errorBounties } = useSWR<BountyListProps[]>(
    workspaceId && partner && isEnrolled
      ? `/api/bounties?workspaceId=${workspaceId}&partnerId=${partner.id}`
      : null,
    fetcher,
  );

  return (
    <div className="border-border-subtle flex flex-col gap-4 rounded-xl border p-4">
      {/* Group */}
      <div className="flex flex-col gap-2">
        {isEnrolled && (
          <div className="flex min-h-7 items-center justify-between">
            <h3 className="text-content-emphasis text-sm font-semibold">
              Group
            </h3>

            {partner &&
              (partner as EnrolledPartnerExtendedProps).status !== "pending" &&
              hasActivityLogs && (
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

      {isEnrolled &&
        (partner as EnrolledPartnerExtendedProps | undefined)?.status ===
          "approved" && (
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
                    group.referralReward,
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
  );
}
