"use client";

import {
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
} from "@/lib/bounty/constants";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { PartnerBountyProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  Button,
  CircleCheckFill,
  FileUpload,
  Label,
  LoadingSpinner,
  Trash,
} from "@dub/ui";
import { cn, formatDate } from "@dub/utils";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

const inputClassName =
  "block h-10 w-full rounded-md px-3 py-2 sm:text-sm " +
  "border-border-default bg-bg-default text-content-emphasis " +
  "placeholder:text-content-muted " +
  "focus:border-border-emphasis focus:outline-none focus:ring-border-emphasis";

export interface FileInput {
  id: string;
  file?: File;
  url?: string;
  uploading: boolean;
  originalFileName?: string;
  originalFileSize?: number;
}

export function EmbedImagesField({
  bounty,
  files,
  setFiles,
  onUploadingChange,
  token,
}: {
  bounty: PartnerBountyProps;
  files: FileInput[];
  setFiles: React.Dispatch<React.SetStateAction<FileInput[]>>;
  onUploadingChange: (uploading: boolean) => void;
  token: string;
}) {
  const imageMax = bounty.submissionRequirements?.image?.max;
  const maxFiles = imageMax ?? BOUNTY_MAX_SUBMISSION_FILES;
  const formatRequirementText = (max?: number | null) =>
    max != null && max > 1 ? ` (1 required, max of ${max})` : " (1 required)";

  const handleUpload = async (file: File) => {
    const newFile: FileInput = { id: uuid(), file, uploading: true };

    setFiles((prev) => {
      const updated = [...prev, newFile];
      onUploadingChange(true);
      return updated;
    });

    try {
      const uploadUrlRes = await fetch(
        "/api/embed/referrals/submissions/upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bountyId: bounty.id }),
        },
      );

      if (!uploadUrlRes.ok) {
        toast.error("Failed to get signed upload URL.");
        setFiles((prev) => {
          const updated = prev.filter((f) => f.id !== newFile.id);
          onUploadingChange(updated.some((f) => f.uploading));
          return updated;
        });
        return;
      }

      const { signedUrl, destinationUrl } = await uploadUrlRes.json();

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        toast.error("Failed to upload screenshot.");
        setFiles((prev) => {
          const updated = prev.filter((f) => f.id !== newFile.id);
          onUploadingChange(updated.some((f) => f.uploading));
          return updated;
        });
        return;
      }

      toast.success(`${file.name} uploaded!`);
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === newFile.id
            ? { ...f, uploading: false, url: destinationUrl }
            : f,
        );
        onUploadingChange(updated.some((f) => f.uploading));
        return updated;
      });
    } catch {
      toast.error(
        "An unexpected error occurred while uploading. Please try again.",
      );
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== newFile.id);
        onUploadingChange(updated.some((f) => f.uploading));
        return updated;
      });
    }
  };

  return (
    <div>
      <Label>Images{formatRequirementText(imageMax)}</Label>
      <div
        className={cn(
          "mt-2 flex h-12 items-center gap-2 transition-[height]",
          files.length === 0 && "h-[104px]",
        )}
      >
        {files.map((file, idx) => (
          <div
            key={file.id}
            className="border-border-subtle bg-bg-default group relative flex aspect-square h-full items-center justify-center rounded-md border"
          >
            {file.uploading ? (
              <LoadingSpinner className="size-4" />
            ) : (
              <div className="relative size-full overflow-hidden rounded-md">
                <img
                  src={file.url}
                  alt={file.file?.name || `Bounty attachment ${idx + 1}`}
                />
              </div>
            )}
            <span className="sr-only">
              {file.file?.name || `File ${idx + 1}`}
            </span>
            <button
              type="button"
              className={cn(
                "absolute right-0 top-0 flex size-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center",
                "border-border-subtle bg-bg-default hover:bg-bg-muted rounded-full border shadow-sm active:scale-95",
                "scale-50 opacity-0 transition-[background-color,transform,opacity] group-hover:scale-100 group-hover:opacity-100",
              )}
              onClick={() =>
                setFiles((prev) => prev.filter((f) => f.id !== file.id))
              }
            >
              <X className="text-content-muted size-2.5" />
            </button>
          </div>
        ))}

        <FileUpload
          accept="images"
          className={cn(
            "border-border-subtle h-full w-auto rounded-md border",
            files.length > 0 ? "aspect-square" : "aspect-[unset] w-full",
          )}
          iconClassName="size-5 shrink-0"
          variant="plain"
          content={
            files.length > 0 ? null : "SVG, JPG, PNG or WEBP\nMax size 5MB"
          }
          onChange={async ({ file }) => await handleUpload(file)}
          disabled={files.length >= maxFiles}
          maxFileSizeMB={5}
        />
      </div>
    </div>
  );
}

export function EmbedSocialUrlField({
  bounty,
  value,
  onChange,
}: {
  bounty: PartnerBountyProps;
  value: string;
  onChange: (v: string) => void;
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const socialPlatform = bountyInfo?.socialPlatform;

  if (!socialPlatform) return null;

  return (
    <div>
      <label className="text-content-emphasis block text-sm font-medium">
        {`${socialPlatform.label} URL`}
      </label>
      <div className="mt-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder={socialPlatform.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(e.target.value.trim())}
          className={inputClassName}
        />
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-3">
        <li className="text-content-muted flex items-center gap-1 text-xs font-medium">
          <CircleCheckFill className="text-content-muted size-2.5" />
          <span>Posted from your account</span>
        </li>
        {bounty.startsAt && (
          <li className="text-content-muted flex items-center gap-1 text-xs font-medium">
            <CircleCheckFill className="text-content-muted size-2.5" />
            <span>{`Posted after ${formatDate(bounty.startsAt, { month: "short", day: "numeric", year: "numeric" })}`}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function EmbedUrlsField({
  bounty,
  urls,
  setUrls,
}: {
  bounty: PartnerBountyProps;
  urls: string[];
  setUrls: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const urlMax = bounty.submissionRequirements?.url?.max;
  const maxUrls = urlMax ?? BOUNTY_MAX_SUBMISSION_URLS;
  const formatRequirementText = (max?: number | null) =>
    max != null && max > 1 ? ` (1 required, max of ${max})` : " (1 required)";
  const firstDomain = bounty.submissionRequirements?.url?.domains?.[0];
  const placeholderUrl = firstDomain ? `https://${firstDomain}` : "https://";
  const rows = urls.length > 0 ? urls : [""];

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>URL{formatRequirementText(urlMax)}</Label>
        <span className="text-content-subtle text-xs font-medium">
          {urls.filter(Boolean).length} / {maxUrls}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {rows.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="url"
              placeholder={placeholderUrl}
              value={url}
              onChange={(e) => {
                setUrls((prev) => {
                  const next =
                    prev.length > i
                      ? [...prev]
                      : [...prev, ...Array(i - prev.length + 1).fill("")];
                  next[i] = e.target.value;
                  return next;
                });
              }}
              className={inputClassName}
            />
            <Button
              variant="outline"
              icon={<Trash className="size-4" />}
              className="bg-bg-error text-content-error hover:bg-bg-error/80 w-10 shrink-0 p-0"
              onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
            />
          </div>
        ))}

        {urls.length < maxUrls && (
          <Button
            variant="secondary"
            text="Add URL"
            className="h-8 rounded-lg"
            onClick={() => setUrls((prev) => [...prev, ""])}
          />
        )}

        {bounty.submissionRequirements?.url?.domains &&
          bounty.submissionRequirements.url.domains.length > 0 && (
            <p className="text-content-muted text-xs">
              Allowed domains:{" "}
              {bounty.submissionRequirements.url.domains.join(", ")}
            </p>
          )}
      </div>
    </div>
  );
}

export function EmbedDescriptionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="embed-submission-description">
        Provide any additional details (optional)
      </Label>
      <ReactTextareaAutosize
        id="embed-submission-description"
        className={cn(
          "mt-2 block w-full resize-none rounded-md focus:outline-none sm:text-sm",
          "border-border-default bg-bg-default text-content-emphasis",
          "placeholder:text-content-muted focus:border-border-emphasis focus:ring-border-emphasis",
        )}
        minRows={3}
        maxLength={BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
        value={value}
        onChange={(e) => {
          if (
            e.target.value.length <= BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH
          ) {
            onChange(e.target.value);
          }
        }}
      />
      <div className="mt-1 text-left">
        <span className="text-content-subtle text-xs">
          {value.length} / {BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH}
        </span>
      </div>
    </div>
  );
}
