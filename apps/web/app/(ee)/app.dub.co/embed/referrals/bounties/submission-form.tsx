"use client";

import { getPeriodLabel } from "@/lib/bounty/periods";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps, PartnerBountySubmission } from "@/lib/types";
import { SocialAccountNotVerifiedWarning } from "@/ui/partners/bounties/bounty-social-content";
import { PlatformType } from "@dub/prisma/client";
import { Button, ChevronRight, Popover, Trophy } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useEmbedToken } from "../../use-embed-token";
import {
  EmbedDescriptionField,
  EmbedImagesField,
  EmbedSocialUrlField,
  EmbedUrlsField,
  type FileInput,
} from "./submission-fields";

export function SubmissionCardHeader({
  title,
  onBack,
  onBackToRoot,
  rightContent,
}: {
  title: string;
  onBack: () => void;
  onBackToRoot: () => void;
  rightContent: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Back to bounties"
            title="Back to bounties"
            onClick={onBackToRoot}
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <Trophy className="size-4" />
          </button>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <button
            type="button"
            aria-label="Back to bounty details"
            title="Back to bounty details"
            onClick={onBack}
            className="text-content-default hover:text-content-emphasis shrink-0 text-sm font-medium transition-colors"
          >
            Bounty details
          </button>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          <span className="text-content-emphasis min-w-0 truncate text-sm font-semibold">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">{rightContent}</div>
      </div>
      <div className="border-border-subtle border-t" />
    </>
  );
}

export function EmbedBountySubmissionForm({
  bounty,
  partnerPlatforms,
  periodNumber,
  existingSubmission,
  onCancel,
  onBackToRoot,
  onSuccess,
}: {
  bounty: PartnerBountyProps;
  partnerPlatforms: Array<{
    type: PlatformType;
    identifier: string;
    verifiedAt: Date | null;
  }>;
  periodNumber: number;
  existingSubmission?: PartnerBountySubmission | null;
  onCancel: () => void;
  onBackToRoot: () => void;
  onSuccess: (submission: PartnerBountySubmission) => void;
}) {
  const router = useRouter();
  const token = useEmbedToken();
  const bountyInfo = resolveBountyDetails(bounty);
  const isSocialMetricsBounty = bountyInfo?.hasSocialMetrics ?? false;
  const partnerPlatform = bountyInfo?.socialPlatform
    ? partnerPlatforms.find((p) => p.type === bountyInfo.socialPlatform?.value)
    : undefined;
  const imageRequired = !!bounty.submissionRequirements?.image;
  const urlRequired =
    !!bounty.submissionRequirements?.url && !isSocialMetricsBounty;

  const [files, setFiles] = useState<FileInput[]>(() =>
    (existingSubmission?.files ?? []).map((f) => ({
      id: uuid(),
      url: f.url,
      uploading: false,
      originalFileName: f.fileName,
      originalFileSize: f.size,
    })),
  );
  const [urls, setUrls] = useState<string[]>(() => {
    if (existingSubmission?.urls?.length) return existingSubmission.urls;
    return isSocialMetricsBounty ? [""] : [""];
  });
  const [description, setDescription] = useState(
    existingSubmission?.description ?? "",
  );

  const [fileUploading, setFileUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [socialContentVerifying, setSocialContentVerifying] = useState(false);
  const [socialContentRequirementsMet, setSocialContentRequirementsMet] =
    useState(true);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const submissionsOpenAt = bounty.submissionsOpenAt
    ? new Date(bounty.submissionsOpenAt)
    : null;
  const submissionsNotOpenYet =
    submissionsOpenAt !== null && submissionsOpenAt > new Date();

  const isBusy =
    fileUploading ||
    isSubmitting ||
    isDraftSaving ||
    (isSocialMetricsBounty &&
      (socialContentVerifying || !socialContentRequirementsMet));
  const isDisabled = submissionsNotOpenYet || isBusy;

  const title =
    bounty.maxSubmissions > 1
      ? `Submission (${getPeriodLabel(bounty.submissionFrequency, periodNumber - 1)})`
      : "Submission";

  const handleSubmit = async (isDraft: boolean) => {
    if (!token || isSubmitting || isDraftSaving || isDisabled) return;

    const completedFiles = files
      .filter((f): f is FileInput & { url: string } => !f.uploading && !!f.url)
      .map((f) => ({
        url: f.url,
        fileName: f.file?.name ?? f.originalFileName ?? "File",
        size: f.file?.size ?? f.originalFileSize ?? 0,
      }));

    const submissionUrls = isSocialMetricsBounty
      ? urls.slice(0, 1).filter(Boolean)
      : urls.filter(Boolean);

    if (!isDraft) {
      if (imageRequired && completedFiles.length === 0) {
        toast.error("You must upload at least one image.");
        return;
      }

      if (urlRequired && submissionUrls.length === 0) {
        toast.error("You must provide at least one URL.");
        return;
      }
    }

    isDraft ? setIsDraftSaving(true) : setIsSubmitting(true);

    try {
      const res = await fetch("/api/embed/referrals/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bountyId: bounty.id,
          files: completedFiles,
          urls: submissionUrls,
          description: description || undefined,
          isDraft,
          periodNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message ?? "Failed to submit bounty.");
        return;
      }

      const submission = await res.json();
      toast.success(isDraft ? "Progress saved!" : "Bounty submitted!");
      onSuccess(submission);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsDraftSaving(false);
    }
  };

  return (
    <div className="border-border-subtle bg-bg-default overflow-hidden rounded-xl border">
      <SubmissionCardHeader
        title={title}
        onBack={onCancel}
        onBackToRoot={onBackToRoot}
        rightContent={
          <>
            {!isSocialMetricsBounty && (
              <Button
                type="button"
                text={isDraftSaving ? "Saving..." : "Save progress"}
                variant="secondary"
                loading={isDraftSaving}
                onClick={() => handleSubmit(true)}
                disabled={isDisabled}
                className="h-8 rounded-lg px-3"
              />
            )}

            <Popover
              openPopover={confirmSubmitOpen}
              setOpenPopover={setConfirmSubmitOpen}
              side="bottom"
              align="end"
              forceDropdown
              content={
                <div className="max-w-sm p-3">
                  <p className="text-sm font-medium text-neutral-800">
                    Confirm submission
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Are you sure you want to submit this bounty? Once submitted,
                    you won't be able to make any further changes.
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      text="Cancel"
                      onClick={() => setConfirmSubmitOpen(false)}
                      className="h-7 w-fit rounded-lg px-3"
                    />
                    <Button
                      variant="primary"
                      text="Confirm submission"
                      loading={isSubmitting}
                      onClick={() => handleSubmit(false)}
                      className="h-7 w-fit rounded-lg px-3"
                    />
                  </div>
                </div>
              }
            >
              <Button
                text={isSubmitting ? "Submitting..." : "Submit"}
                loading={isSubmitting}
                onClick={() => {
                  if (!isDisabled) {
                    setConfirmSubmitOpen(true);
                  }
                }}
                disabled={isDisabled}
                className="h-8 rounded-lg px-3"
              />
            </Popover>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-5">
        {submissionsNotOpenYet && submissionsOpenAt && (
          <div className="bg-bg-attention text-content-attention rounded-lg p-2 text-center text-sm font-medium">
            Submissions open{" "}
            {submissionsOpenAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            at{" "}
            {submissionsOpenAt.toLocaleTimeString("en-US", {
              hour: "numeric",
              hour12: true,
            })}
          </div>
        )}

        {imageRequired && (
          <EmbedImagesField
            bounty={bounty}
            files={files}
            setFiles={setFiles}
            onUploadingChange={setFileUploading}
            token={token ?? ""}
          />
        )}

        {isSocialMetricsBounty && bountyInfo?.socialPlatform ? (
          <>
            {!partnerPlatform?.verifiedAt && (
              <SocialAccountNotVerifiedWarning bounty={bounty} />
            )}
            <EmbedSocialUrlField
              bounty={bounty}
              value={urls[0] ?? ""}
              onChange={(v) => setUrls([v])}
              partnerPlatform={partnerPlatform}
              onVerifyingChange={setSocialContentVerifying}
              onRequirementsMetChange={setSocialContentRequirementsMet}
            />
          </>
        ) : (
          urlRequired && (
            <EmbedUrlsField bounty={bounty} urls={urls} setUrls={setUrls} />
          )
        )}

        <EmbedDescriptionField value={description} onChange={setDescription} />
      </div>
    </div>
  );
}
