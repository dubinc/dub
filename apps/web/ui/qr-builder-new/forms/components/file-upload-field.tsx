"use client";

import { cn } from "@dub/utils";
import { Button } from "@radix-ui/themes";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useFileUpload } from "../../hooks/use-file-upload";

interface FileUploadFieldProps {
  name: string;
  label: string;
  accept: string;
  maxSize: number;
  multiple?: boolean;
  className?: string;
  onFileIdReceived?: (fileId: string) => void;
  title: string;
}

export const FileUploadField = ({
  name,
  label,
  accept,
  maxSize,
  multiple = false,
  className,
  onFileIdReceived,
  title,
}: FileUploadFieldProps) => {
  const { control } = useFormContext();
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { uploadFile } = useFileUpload({
    onFileIdReceived,
    onError: (_, error) => setUploadError(error),
    onSuccess: () => setUploadError(""),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleFileChange = useCallback(
    async (
      files: FileList | null,
      onChange: (files: FileList | null) => void,
    ) => {
      if (!files || files.length === 0) return;

      const file = files[0];

      if (file.size > maxSize) {
        setUploadError(
          `File too large. Maximum size is ${formatFileSize(maxSize)}`,
        );
        return;
      }

      setUploadError("");
      onChange(files);

      try {
        await uploadFile(file);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    },
    [maxSize, formatFileSize, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, onChange: (files: FileList | null) => void) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleFileChange(e.dataTransfer.files, onChange);
      }
    },
    [handleFileChange],
  );

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      onChange: (files: FileList | null) => void,
    ) => {
      handleFileChange(e.target.files, onChange);
    },
    [handleFileChange],
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
        render={({ field: { onChange }, fieldState }) => (
          <>
            <div
              className={cn(
                "relative rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:bg-gray-50",
                {
                  "border-blue-400 bg-blue-50": dragActive,
                  "border-red-500": fieldState.error,
                },
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, onChange)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => handleInputChange(e, onChange)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />

              <div className="flex flex-col items-center gap-1 text-center mb-2">
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
                variant="solid"
                color="blue"
                size="2"
                className="mt-2 w-fit"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </Button>

              {(fieldState.error || uploadError) && (
                <span className="text-sm text-red-500">
                  {fieldState.error?.message || uploadError}
                </span>
              )}
            </div>
          </>
        )}
      />
    </div>
  );
};
