"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { uploadProgramApplicationImageAction } from "@/lib/actions/partners/upload-program-application-image";
import {
  PROGRAM_APPLICATION_IMAGE_ALLOWED_TYPES,
  PROGRAM_APPLICATION_IMAGE_ALLOWED_TYPES_LABEL,
  PROGRAM_APPLICATION_IMAGE_MAX_FILE_SIZE_MB,
} from "@/lib/constants/program";
import { programApplicationFormImageUploadFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { X } from "@/ui/shared/icons";
import { FileUpload, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";
import { FormControl } from "./form-control";

type ImageUploadFieldData = z.infer<
  typeof programApplicationFormImageUploadFieldSchema
>;

interface FileInput {
  id: string;
  file?: File;
  url?: string;
  uploading: boolean;
}

function ImageUploadFieldContent({
  field,
  preview,
  programSlug,
  controllerField,
  maxImages,
  error,
  uploadFile,
  onStatusChange,
}: {
  field: ImageUploadFieldData;
  preview?: boolean;
  programSlug: string;
  controllerField: { value: any; onChange: (value: any) => void };
  maxImages: number;
  error: boolean;
  uploadFile: (params: { programSlug: string }) => Promise<any>;
  onStatusChange?: (loading: boolean) => void;
}) {
  const currentValue = controllerField.value || [];

  // Track if we're updating from an internal change to prevent circular updates
  const isInternalUpdateRef = useRef(false);

  // Initialize files state from form value
  const [files, setFiles] = useState<FileInput[]>(() => {
    if (Array.isArray(currentValue) && currentValue.length > 0) {
      return currentValue.map((url: string) => ({
        id: uuid(),
        url,
        uploading: false,
        file: undefined,
      }));
    }
    return [];
  });

  // Sync files state with form value when it changes externally
  useEffect(() => {
    // Skip if this is an internal update
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (Array.isArray(currentValue)) {
      const currentUrls = currentValue.filter(Boolean);
      const fileUrls = files
        .filter((f) => f.url && !f.uploading)
        .map((f) => f.url!)
        .filter(Boolean);

      // Only update if URLs differ (compare as sets to handle reordering)
      const currentUrlsSet = new Set(currentUrls);
      const fileUrlsSet = new Set(fileUrls);

      if (
        currentUrls.length !== fileUrls.length ||
        currentUrls.some((url) => !fileUrlsSet.has(url)) ||
        fileUrls.some((url) => !currentUrlsSet.has(url))
      ) {
        // Preserve uploading files when syncing
        const uploadingFiles = files.filter((f) => f.uploading);
        const syncedFiles = currentUrls.map((url: string) => ({
          id: uuid(),
          url,
          uploading: false,
          file: undefined,
        }));
        setFiles([...syncedFiles, ...uploadingFiles]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue]);

  // Update form value when files change
  useEffect(() => {
    const urls = files.filter((f) => f.url && !f.uploading).map((f) => f.url!);

    // Compare with current form value to avoid unnecessary updates
    // Read currentValue directly from controllerField to avoid stale closure
    const formValue = controllerField.value || [];
    const currentUrls = Array.isArray(formValue)
      ? formValue.filter(Boolean)
      : [];

    // Compare as sets to handle reordering
    const urlsSet = new Set(urls);
    const currentUrlsSet = new Set(currentUrls);

    // Only update if URLs actually changed
    if (
      urls.length !== currentUrls.length ||
      urls.some((url) => !currentUrlsSet.has(url)) ||
      currentUrls.some((url) => !urlsSet.has(url))
    ) {
      isInternalUpdateRef.current = true;
      controllerField.onChange(urls);
    }
  }, [files, controllerField]);

  const handleUpload = async (file: File) => {
    if (!programSlug) {
      toast.error(
        "Unable to upload image. Please refresh the page and try again.",
      );
      return;
    }

    // Validate file type
    if (!PROGRAM_APPLICATION_IMAGE_ALLOWED_TYPES.includes(file.type as any)) {
      toast.error(
        `Invalid file type. Allowed types: ${PROGRAM_APPLICATION_IMAGE_ALLOWED_TYPES_LABEL}`,
      );
      return;
    }

    // Validate file size
    if (file.size > PROGRAM_APPLICATION_IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(
        `File size exceeds maximum of ${PROGRAM_APPLICATION_IMAGE_MAX_FILE_SIZE_MB}MB`,
      );
      return;
    }

    // Check max images limit
    const currentUploadedCount = files.filter(
      (f) => f.url && !f.uploading,
    ).length;
    if (currentUploadedCount >= maxImages) {
      toast.error(
        `Maximum of ${maxImages} image${maxImages === 1 ? "" : "s"} allowed`,
      );
      return;
    }

    const newFile: FileInput = { id: uuid(), file, uploading: true };
    setFiles((prev) => [...prev, newFile]);

    try {
      const result = await uploadFile({
        programSlug,
      });

      if (!result?.data) {
        toast.error("Failed to upload image. Please try again.");
        setFiles((prev) => prev.filter((f) => f.id !== newFile.id));
        return;
      }

      const { signedUrl, destinationUrl } = result.data;

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        const result = await uploadResponse.json();
        throw new Error(
          result.error?.message || "Failed to upload image to storage",
        );
      }

      toast.success(`${file.name} uploaded!`);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? { ...f, uploading: false, url: destinationUrl }
            : f,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again.",
      );
      setFiles((prev) => prev.filter((f) => f.id !== newFile.id));
    }
  };

  const fileUploading = files.some(({ uploading }) => uploading);

  // Track the callback in a ref to avoid infinite loops from changing function references
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // Notify parent when async state changes
  useEffect(() => {
    onStatusChangeRef.current?.(fileUploading);
  }, [fileUploading]);

  return (
    <div className="mt-2">
      <div
        className={cn(
          "flex h-12 items-center gap-2 transition-[height]",
          files.length === 0 && "h-24",
        )}
      >
        {files.map((file, idx) => (
          <div
            key={file.id}
            className="border-border-subtle group relative flex aspect-square h-full items-center justify-center rounded-md border bg-white"
          >
            {file.uploading ? (
              <LoadingSpinner className="size-4" />
            ) : file.url ? (
              <div className="relative size-full overflow-hidden rounded-md">
                <img
                  src={file.url}
                  alt={`Upload ${idx + 1}`}
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <span className="sr-only">
              {file.file?.name || `File ${idx + 1}`}
            </span>
            {!preview && (
              <button
                type="button"
                className={cn(
                  "absolute right-0 top-0 flex size-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center",
                  "rounded-full border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50 active:scale-95",
                  "scale-50 opacity-0 transition-[background-color,transform,opacity] group-hover:scale-100 group-hover:opacity-100",
                )}
                onClick={() => {
                  setFiles((prev) => prev.filter((s) => s.id !== file.id));
                }}
              >
                <X className="size-2.5 text-neutral-400" />
              </button>
            )}
          </div>
        ))}

        <FileUpload
          accept="images"
          className={cn(
            "border-border-subtle h-full w-auto rounded-md border",
            files.length > 0 ? "aspect-square" : "aspect-[unset] w-full",
            error && "border-red-400",
          )}
          iconClassName="size-5 shrink-0"
          variant="plain"
          content={
            files.length > 0
              ? null
              : `${PROGRAM_APPLICATION_IMAGE_ALLOWED_TYPES_LABEL}, max size of ${PROGRAM_APPLICATION_IMAGE_MAX_FILE_SIZE_MB}MB`
          }
          onChange={
            preview ? undefined : async ({ file }) => await handleUpload(file)
          }
          disabled={preview || files.length >= maxImages || fileUploading}
          maxFileSizeMB={PROGRAM_APPLICATION_IMAGE_MAX_FILE_SIZE_MB}
        />
      </div>
    </div>
  );
}

export function ImageUploadField({
  keyPath: keyPathProp,
  field,
  preview,
  onStatusChange,
}: {
  keyPath?: string;
  field: ImageUploadFieldData;
  preview?: boolean;
  onStatusChange?: (loading: boolean) => void;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const { getFieldState, control } = useFormContext<any>();

  const keyPath = keyPathProp ? `${keyPathProp}.value` : "value";
  const state = getFieldState(keyPath);

  const { executeAsync: uploadFile } = useAction(
    uploadProgramApplicationImageAction,
    {
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to upload image."));
        onStatusChange?.(false);
      },
    },
  );

  const maxImages = field.data.maxImages || 1;
  const error = !!state.error;

  return (
    <FormControl
      label={field.label}
      required={field.required}
      error={state.error?.message}
    >
      <Controller
        control={control}
        name={keyPath}
        rules={
          preview
            ? {}
            : {
                validate: (val: any) => {
                  if (field.required) {
                    const imageUrls = Array.isArray(val)
                      ? val.filter(Boolean)
                      : [];
                    if (imageUrls.length === 0) {
                      return `${field.label} is required`;
                    }
                  }
                  return true;
                },
              }
        }
        render={({ field: controllerField }) => (
          <ImageUploadFieldContent
            field={field}
            preview={preview}
            programSlug={programSlug || ""}
            controllerField={controllerField}
            maxImages={maxImages}
            error={error}
            uploadFile={uploadFile}
            onStatusChange={onStatusChange}
          />
        )}
      />
    </FormControl>
  );
}
