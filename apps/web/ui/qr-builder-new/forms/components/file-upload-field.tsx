"use client";

import { cn } from "@dub/utils";
import { Button } from "@radix-ui/themes";
import { Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
} from "../../components/file-upload";
import { useFileUpload as useFileUploadHook } from "../../hooks/use-file-upload";

interface FileUploadFieldProps {
  name: string;
  label: string;
  accept: string;
  maxSize: number;
  multiple?: boolean;
  className?: string;
  onFileIdReceived?: (fileId: string) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  onProcessingStateChange?: (processing: boolean) => void;
  title: string;
}

export const FileUploadField = ({
  name,
  label,
  accept,
  maxSize,
  className,
  onFileIdReceived,
  onUploadStateChange,
  onProcessingStateChange,
  title,
}: FileUploadFieldProps) => {
  const { control } = useFormContext();
  const [uploadError, setUploadError] = useState<string>("");

  const { uploadFile, isUploading, uploadProgress } = useFileUploadHook({
    onFileIdReceived,
    onError: (_, error) => setUploadError(error),
    onSuccess: () => setUploadError(""),
  });

  // Notify parent about upload state changes
  useEffect(() => {
    onUploadStateChange?.(isUploading);
  }, [isUploading, onUploadStateChange]);

  // Notify parent about processing state changes
  useEffect(() => {
    const isProcessing = uploadProgress.some((p) => p.status === "processing");
    onProcessingStateChange?.(isProcessing);
  }, [uploadProgress, onProcessingStateChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileValidation = useCallback(
    (file: File) => {
      if (file.size > maxSize) {
        return `File too large. Maximum size is ${formatFileSize(maxSize)}`;
      }
      return null;
    },
    [maxSize],
  );

  const handleFileReject = useCallback((file: File, message: string) => {
    setUploadError(message);
  }, []);

  const handleFileAccept = useCallback(() => {
    setUploadError("");
  }, []);

  const handleUpload = useCallback(
    async (
      files: File[],
      {
        onProgress,
        onSuccess,
        onError,
      }: {
        onProgress: (file: File, progress: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, error: Error) => void;
      },
    ) => {
      try {
        await Promise.all(
          files.map(async (file: File) => {
            try {
              onProgress(file, 0);
              await uploadFile(file);
              onSuccess(file);
            } catch (error) {
              const err =
                error instanceof Error ? error : new Error("Upload failed");
              onError(file, err);
              setUploadError(err.message);
            }
          }),
        );
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    [uploadFile],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-neutral text-sm font-medium">
        {label}
        <span className="text-red-500">*</span>
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange }, fieldState }) => (
          <>
            <FileUpload
              maxFiles={1}
              maxSize={maxSize}
              className="w-full max-w-xl"
              value={value || []}
              onValueChange={onChange}
              onFileAccept={handleFileAccept}
              onFileReject={handleFileReject}
              onFileValidate={handleFileValidation}
              onUpload={handleUpload}
              accept={accept}
              disabled={isUploading}
            >
              <FileUploadDropzone
                className={cn("border-secondary-100", {
                  "border-red-500": fieldState.error || uploadError,
                })}
              >
                <div className="mb-2 flex flex-col items-center gap-1 text-center">
                  <div className="border-secondary-100 flex items-center justify-center rounded-full border p-2.5">
                    <Upload className="text-secondary size-6" />
                  </div>
                  <p className="text-neutral text-sm font-medium">
                    {`Drag & drop your ${title}`}
                  </p>
                  <p className="text-xs text-neutral-800">
                    {`or click to browse (1 file, up to ${formatFileSize(maxSize)})`}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="solid"
                  color="blue"
                  size="2"
                  className="mt-2 w-fit"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Browse files"}
                </Button>
              </FileUploadDropzone>

              <FileUploadList>
                {(value || []).map((file: File, index: number) => (
                  <FileUploadItem key={index} value={file}>
                    <div className="flex w-full items-center gap-2">
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="1">
                          <X className="stroke-neutral-200" />
                        </Button>
                      </FileUploadItemDelete>
                    </div>
                    <FileUploadItemProgress />
                  </FileUploadItem>
                ))}
              </FileUploadList>
            </FileUpload>

            {(fieldState.error || uploadError) && (
              <span className="text-sm text-red-500">
                {fieldState.error?.message || uploadError}
              </span>
            )}
          </>
        )}
      />
    </div>
  );
};
