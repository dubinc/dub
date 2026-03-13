"use client";

import { PartnerBountyProps } from "@/lib/types";
import { BountyDescription } from "@/ui/partners/bounties/bounty-description";
import {
  PerformanceBountyProgress,
  SubmissionBountyProgress,
} from "@/ui/partners/bounties/bounty-performance";
import { BountyRewardCriteria } from "@/ui/partners/bounties/bounty-reward-criteria";
import { BountyRewardDescription } from "@/ui/partners/bounties/bounty-reward-description";
import { BountyStatusBadge } from "@/ui/partners/bounties/bounty-status-badge";
import { BountySubmissionRequirements } from "@/ui/partners/bounties/bounty-submission-requirements";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Trophy } from "@dub/ui/icons";
import { useState } from "react";
import {
  BountyEndDate,
  BountyRewardsTable,
} from "../../../../partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/bounty-card";
import { EmbedBountyPerformanceSection } from "./performance-section";
import { EmbedBountySubmissionsTable } from "./submissions-table";
import {
  EmbedBountySubmissionDetail,
  EmbedBountySubmissionForm,
} from "./submission-form";

export type EmbedBountyView =
  | { mode: "detail" }
  | { mode: "submission-form"; periodNumber: number }
  | { mode: "submission-view"; periodNumber: number };

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

export function EmbedBountyDetail({
  bounty: initialBounty,
  view,
  setView,
  onBack,
  onBountyUpdate,
}: {
  bounty: PartnerBountyProps;
  view: EmbedBountyView;
  setView: (v: EmbedBountyView) => void;
  onBack: () => void;
  onBountyUpdate?: (bounty: PartnerBountyProps) => void;
}) {
  const [bounty, setBounty] = useState<PartnerBountyProps>(initialBounty);

  const hasRewards = bounty.submissions.some((s) => s.commission != null);

  const handleSubmissionSuccess = (newSubmission: PartnerBountySubmission) => {
    // The raw API response has no `commission` field; normalize to null so
    // downstream components don't crash on undefined.
    const normalized: PartnerBountySubmission = {
      ...newSubmission,
      commission: newSubmission.commission ?? null,
    };
    setBounty((prev) => {
      const existing = prev.submissions.find(
        (s) => s.periodNumber === normalized.periodNumber,
      );
      const updatedSubmissions = existing
        ? prev.submissions.map((s) =>
            s.periodNumber === normalized.periodNumber ? normalized : s,
          )
        : [...prev.submissions, normalized];
      const updated = { ...prev, submissions: updatedSubmissions };
      // Sync the updated bounty up to the parent so it survives view remounts
      onBountyUpdate?.(updated);
      return updated;
    });
    setView({
      mode: "submission-view",
      periodNumber: newSubmission.periodNumber,
    });
  };

  const existingSubmission =
    view.mode === "submission-form"
      ? bounty.submissions.find((s) => s.periodNumber === view.periodNumber) ??
        null
      : null;

  const viewSubmission =
    view.mode === "submission-view"
      ? bounty.submissions.find((s) => s.periodNumber === view.periodNumber)
      : undefined;

  if (view.mode === "submission-form") {
    return (
      <EmbedBountySubmissionForm
        bounty={bounty}
        periodNumber={
          (view as { mode: "submission-form"; periodNumber: number })
            .periodNumber
        }
        existingSubmission={existingSubmission}
        onCancel={() => setView({ mode: "detail" })}
        onSuccess={handleSubmissionSuccess}
      />
    );
  }

  if (view.mode === "submission-view" && viewSubmission) {
    return (
      <EmbedBountySubmissionDetail
        bounty={bounty}
        submission={viewSubmission}
        periodNumber={
          (view as { mode: "submission-view"; periodNumber: number })
            .periodNumber
        }
        onBack={() => setView({ mode: "detail" })}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-bg-subtle flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Trophy className="size-4" />
          </div>
          <span className="text-content-emphasis text-sm font-semibold">
            Bounty details
          </span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="border-border-subtle text-content-default hover:bg-bg-muted flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors duration-100"
        >
          Back
        </button>
      </div>

      {/* Header divider */}
      <div className="border-t border-neutral-200" />

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:divide-x lg:divide-neutral-200">
        {/* Left col: content */}
        <div className="flex flex-col gap-6 p-5">
          {/* Progress */}
          <div className="flex flex-col gap-3">
            <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
              Progress
            </h2>
            <div className="border-border-subtle flex w-full flex-col gap-4 rounded-xl border bg-white px-5 pb-4 pt-6">
              {bounty.type === "performance" ? (
                <PerformanceBountyProgress
                  bounty={bounty}
                  labelClassName="text-base"
                />
              ) : (
                <SubmissionBountyProgress
                  bounty={bounty}
                  labelClassName="text-base"
                />
              )}
            </div>
          </div>

          {/* Performance or submission section */}
          {bounty.type === "performance" ? (
            <EmbedBountyPerformanceSection bounty={bounty} />
          ) : (
            <EmbedBountySubmissionsTable
              bounty={bounty}
              onSubmit={(periodNumber) =>
                setView({ mode: "submission-form", periodNumber })
              }
              onView={(periodNumber) =>
                setView({ mode: "submission-view", periodNumber })
              }
            />
          )}

          {/* Info section */}
          <div className="flex flex-col gap-6 text-sm">
            <BountySubmissionRequirements bounty={bounty} />
            <BountyRewardCriteria bounty={bounty} />
            <BountyDescription bounty={bounty} />
          </div>
        </div>

        {/* Right col: bounty info (no card wrapper) */}
        <div className="flex flex-col gap-4 border-t border-neutral-200 p-5 lg:border-t-0">
          {/* Thumbnail */}
          <div className="relative flex h-[160px] items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
            <div className="relative size-full">
              <BountyThumbnailImage bounty={bounty} />
            </div>
            <BountyStatusBadge bounty={bounty} />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-1">
            <h3 className="text-content-emphasis text-sm font-semibold">
              {bounty.name}
            </h3>
            <BountyEndDate bounty={bounty} />
            <BountyRewardDescription bounty={bounty} className="font-medium" />
          </div>

          {/* Rewards table */}
          {hasRewards && <BountyRewardsTable bounty={bounty} />}
        </div>
      </div>
    </div>
  );
}
