"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@dub/utils";
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
  required?: boolean;
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
  required = true,
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

  const formatAcceptTypes = (accept: string) => {
    if (accept === "image/*") return "PNG, JPG, JPEG, etc.";
    if (accept === "application/pdf") return "PDF";
    if (accept === "video/*") return "MP4, MOV, AVI, etc.";
    // Fallback: clean up the accept string
    return accept
      .split(",")
      .map((type) => type.trim().replace("application/", "").replace("/*", "").toUpperCase())
      .join(", ");
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
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label className="text-neutral text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange }, fieldState }) => (
          <>
            <FileUpload
              maxFiles={1}
              maxSize={maxSize}
              className="w-full max-w-none"
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
                className={cn(
                  "border-border hover:border-secondary hover:bg-muted/30 min-h-[240px] w-full cursor-pointer px-6 py-12 transition-all duration-200",
                  {
                    "border-red-500 hover:border-red-500":
                      fieldState.error || uploadError,
                  },
                )}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="border-border group-hover:border-secondary flex items-center justify-center rounded-full border p-3 transition-colors duration-200">
                    <Upload className="text-secondary size-8 transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-neutral text-base font-medium">
                      Click to upload or drag & drop your {title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Max size: {formatFileSize(maxSize)} • {formatAcceptTypes(accept)}
                    </p>
                  </div>
                </div>
              </FileUploadDropzone>

              <FileUploadList>
                {(value || []).map((file: File, index: number) => (
                  <FileUploadItem key={index} value={file}>
                    <div className="flex w-full items-center gap-2">
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="sm">
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
