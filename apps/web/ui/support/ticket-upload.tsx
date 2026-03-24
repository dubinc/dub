"use client";

import { FileContent, Xmark } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 5;

type FileStatus = "pending" | "uploading" | "done" | "error";

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  attachmentId?: string;
  errorMessage?: string;
};

async function uploadToPlain(
  file: File,
): Promise<{ attachmentId: string } | { error: string }> {
  const res = await fetch("/api/ai/support-chat/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
  });

  if (!res.ok) {
    return { error: "Failed to get upload URL" };
  }

  const {
    attachmentId,
    uploadFormUrl,
    uploadFormData,
  }: {
    attachmentId: string;
    uploadFormUrl: string;
    uploadFormData: { key: string; value: string }[];
  } = await res.json();

  const formData = new FormData();
  for (const { key, value } of uploadFormData) {
    formData.append(key, value);
  }
  formData.append("file", file);

  const uploadRes = await fetch(uploadFormUrl, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    return { error: "Upload failed" };
  }

  return { attachmentId };
}

export function TicketUpload({
  onSubmit,
  onCancel,
  submitted = false,
}: {
  onSubmit: (attachmentIds: string[], details: string) => void;
  onCancel?: () => void;
  submitted?: boolean;
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [details, setDetails] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = files.some((f) => f.status === "uploading");
  const canSubmit = !isUploading;

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming
      .filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) return false;
        if (f.size > MAX_FILE_SIZE_BYTES) return false;
        return true;
      })
      .slice(0, MAX_FILES);

    if (valid.length === 0) return;

    const entries: FileEntry[] = valid.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      status: "uploading",
    }));

    setFiles((prev) => [...prev, ...entries].slice(0, MAX_FILES));

    entries.forEach((entry) => {
      uploadToPlain(entry.file).then((result) => {
        setFiles((prev) => {
          if (!prev.some((f) => f.id === entry.id)) return prev;
          return prev.map((f) =>
            f.id === entry.id
              ? "error" in result
                ? { ...f, status: "error", errorMessage: result.error }
                : { ...f, status: "done", attachmentId: result.attachmentId }
              : f,
          );
        });
      });
    });
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = () => {
    const attachmentIds = files
      .filter((f) => f.status === "done" && f.attachmentId)
      .map((f) => f.attachmentId!);
    onSubmit(attachmentIds, details.trim());
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 px-3 pb-3">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-700">
            Ticket submitted
          </p>
          <p className="text-xs text-neutral-500">
            Our support team will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 pt-0">
      <div>
        <p className="text-sm font-medium text-neutral-700">
          Create a support ticket
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Our team will review your request and get back to you shortly.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-neutral-500">
          What can we help with?
        </p>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe your issue in more detail..."
          rows={3}
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500">Attachments</p>
        <p className="text-xs text-neutral-400">
          Images, PDF · max {MAX_FILE_SIZE_MB}MB · up to {MAX_FILES} files
        </p>
      </div>

      {files.length < MAX_FILES && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
            isDragging
              ? "border-neutral-400 bg-neutral-50"
              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
          )}
        >
          <p className="text-xs font-medium text-neutral-500">
            Drag & drop or{" "}
            <span className="text-neutral-700 underline underline-offset-2">
              browse
            </span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((entry) => (
            <FilePreview
              key={entry.id}
              entry={entry}
              onRemove={() => removeFile(entry.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
            canSubmit
              ? "bg-neutral-900 text-white hover:bg-neutral-700"
              : "cursor-not-allowed bg-neutral-200 text-neutral-400",
          )}
        >
          {isUploading ? "Uploading..." : "Submit ticket"}
        </button>
      </div>
    </div>
  );
}

function FilePreview({
  entry,
  onRemove,
}: {
  entry: FileEntry;
  onRemove: () => void;
}) {
  const isImage = entry.file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(entry.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.file, isImage]);

  const removeBtn = (
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remove file"
      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-white shadow transition-colors hover:bg-neutral-700"
    >
      <Xmark className="size-2.5" />
    </button>
  );

  if (isImage && previewUrl) {
    return (
      <div className="relative size-16 shrink-0">
        <img
          src={previewUrl}
          alt={entry.file.name}
          className={cn(
            "size-full rounded-lg object-cover",
            entry.status === "uploading" && "opacity-50",
            entry.status === "error" && "opacity-50 ring-2 ring-red-400",
          )}
        />
        {entry.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
            <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
        {removeBtn}
      </div>
    );
  }

  const fileTypeLabel =
    entry.status === "uploading"
      ? "Uploading…"
      : entry.status === "error"
        ? "Failed"
        : entry.file.type === "application/pdf"
          ? "PDF"
          : entry.file.type === "text/csv"
            ? "CSV"
            : "File";

  return (
    <div className="relative flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white py-2 pl-2.5 pr-8">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <FileContent className="size-4 text-neutral-400" />
      </div>
      <div className="max-w-[112px]">
        <p className="truncate text-xs font-medium text-neutral-700">
          {entry.file.name}
        </p>
        <p
          className={cn(
            "text-[10px]",
            entry.status === "error" ? "text-red-500" : "text-neutral-400",
          )}
        >
          {fileTypeLabel}
        </p>
      </div>
      {removeBtn}
    </div>
  );
}
