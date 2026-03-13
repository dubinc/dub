"use client";

import { getPeriodLabel } from "@/lib/bounty/periods";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { LoadingSpinner } from "@dub/ui";
import { Trophy } from "@dub/ui/icons";
import { cn } from "@dub/utils";
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

export { EmbedBountySubmissionDetail } from "./submission-detail";

type PartnerBountySubmission = PartnerBountyProps["submissions"][number];

export function SubmissionCardHeader({
  title,
  rightContent,
}: {
  title: string;
  rightContent: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-neutral-800">
          <Trophy className="size-4" />

          <span className="font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">{rightContent}</div>
      </div>
      <div className="border-t border-neutral-200" />
    </>
  );
}

export function headerButtonClass(primary = false) {
  return cn(
    "flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors duration-100",
    primary
      ? "border-transparent bg-neutral-900 text-white hover:bg-neutral-700"
      : "border-border-subtle text-content-default hover:bg-bg-muted",
  );
}

export function EmbedBountySubmissionForm({
  bounty,
  periodNumber,
  existingSubmission,
  onCancel,
  onSuccess,
}: {
  bounty: PartnerBountyProps;
  periodNumber: number;
  existingSubmission?: PartnerBountySubmission | null;
  onCancel: () => void;
  onSuccess: (submission: PartnerBountySubmission) => void;
}) {
  const token = useEmbedToken();
  const bountyInfo = resolveBountyDetails(bounty);
  const isSocialMetricsBounty = bountyInfo?.hasSocialMetrics ?? false;
  const imageRequired = !!bounty.submissionRequirements?.image;
  const urlRequired =
    !!bounty.submissionRequirements?.url && !isSocialMetricsBounty;

  const [files, setFiles] = useState<FileInput[]>(() =>
    (existingSubmission?.files ?? []).map((f) => ({
      id: uuid(),
      url: f.url,
      uploading: false,
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

  const submissionsOpenAt = bounty.submissionsOpenAt
    ? new Date(bounty.submissionsOpenAt)
    : null;
  const submissionsNotOpenYet =
    submissionsOpenAt !== null && submissionsOpenAt > new Date();

  const title =
    bounty.maxSubmissions > 1
      ? `Submission (${getPeriodLabel(bounty.submissionFrequency, periodNumber - 1)})`
      : "Submission";

  const handleSubmit = async (isDraft: boolean) => {
    if (!token) return;

    const completedFiles = files
      .filter((f): f is FileInput & { url: string } => !f.uploading && !!f.url)
      .map((f) => ({
        url: f.url,
        fileName: f.file?.name ?? "File",
        size: f.file?.size ?? 0,
      }));

    const submissionUrls = isSocialMetricsBounty
      ? urls.slice(0, 1).filter(Boolean)
      : urls.filter(Boolean);

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
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsDraftSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <SubmissionCardHeader
        title={title}
        rightContent={
          <>
            <button
              type="button"
              onClick={onCancel}
              className={headerButtonClass()}
            >
              Cancel
            </button>
            {!isSocialMetricsBounty && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={
                  fileUploading || isDraftSaving || submissionsNotOpenYet
                }
                className={headerButtonClass()}
              >
                {isDraftSaving ? (
                  <LoadingSpinner className="size-4" />
                ) : (
                  "Save progress"
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={
                fileUploading ||
                isSubmitting ||
                isDraftSaving ||
                submissionsNotOpenYet
              }
              className={headerButtonClass(true)}
            >
              {isSubmitting ? (
                <LoadingSpinner className="size-4 text-white" />
              ) : (
                "Submit"
              )}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-5 p-5">
        {submissionsNotOpenYet && submissionsOpenAt && (
          <div className="rounded-lg bg-orange-50 p-2 text-center text-sm font-medium text-orange-800">
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
          <EmbedSocialUrlField
            bounty={bounty}
            value={urls[0] ?? ""}
            onChange={(v) => setUrls([v])}
          />
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
