import { FileCardTitle } from "@/ui/qr-builder/components/file-card-content/components/file-card-title.tsx";
import { DEFAULT_QR_BUILDER_DATA } from "@/ui/qr-builder/constants/customization/qr-builder-data.ts";
import { EAcceptedFileType } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { FileUploadProps, useLocalStorage } from "@dub/ui";
import { cn } from "@dub/utils";
import { Button } from "@radix-ui/themes";
import { X } from "lucide-react";
import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { uploadFileWithProgress } from "../../helpers/upload-file-with-progress.ts";
import { FileDropzone } from "./components/file-dropzone.tsx";
import { FileErrorMessage } from "./components/file-error-message.tsx";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
} from "./components/file-upload.tsx";
import { LogoDropzone } from "./components/logo-dropzone.tsx";

interface IFileCardContentProps {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  acceptedFileType: EAcceptedFileType;
  maxFileSize: number;
  fileError: string;
  title?: string;
  isLogo?: boolean;
  homePageDemo?: boolean;
  onFileIdReceived?: (fileId: string) => void;
  isEdit?: boolean;
  isFileUploading?: boolean;
  setIsFileUploading?: Dispatch<SetStateAction<boolean>>;
  isFileProcessing?: boolean;
  setIsFileProcessing?: Dispatch<SetStateAction<boolean>>;
}

export const FileCardContent: FC<IFileCardContentProps> = ({
  files,
  setFiles,
  acceptedFileType,
  maxFileSize,
  fileError,
  title,
  isLogo = false,
  homePageDemo = false,
  onFileIdReceived,
  isEdit = false,
  isFileUploading = false,
  setIsFileUploading,
  isFileProcessing = false,
  setIsFileProcessing,
}) => {
  const [localFileError, setLocalFileError] = useState<string>("");
  const fileItemRef = useRef<HTMLDivElement | null>(null);
  const hadFileBeforeRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const onFileReject = (file: File, message: string) => {
    setLocalFileError(message);
  };

  const onFileAccept = (file: File) => {
    setLocalFileError("");
  };

  const handleFileRemoval = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setFiles([]);
    setIsFileUploading?.(false);
    setIsFileProcessing?.(false);
    setLocalFileError("");
  };

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (files: File[], { onProgress, onSuccess, onError }) => {
      abortControllerRef.current = new AbortController();

      setIsFileUploading?.(true);

      try {
        await Promise.all(
          files.map(async (file: File) => {
            try {
              onProgress(file, 0);

              const result = await uploadFileWithProgress(
                file,
                (file, progress) => {
                  onProgress(file, progress);

                  if (progress === 100) {
                    setIsFileUploading?.(false);
                    setIsFileProcessing?.(true);
                  }
                },
                abortControllerRef.current?.signal,
              );

              onSuccess(file);

              if (result?.file?.id) {
                const fileId = result.file.id;

                if (homePageDemo) {
                  const updatedData: QRBuilderData = {
                    ...(qrDataToCreate || DEFAULT_QR_BUILDER_DATA),
                    fileId,
                  };

                  setQrDataToCreate(updatedData);
                }

                onFileIdReceived?.(fileId);
              }
            } catch (fileError) {
              if (
                fileError instanceof Error &&
                fileError.name === "AbortError"
              ) {
                return;
              }

              const error =
                fileError instanceof Error
                  ? fileError
                  : new Error("Upload failed");
              onError(file, error);
              setLocalFileError(error.message);
            }
          }),
        );
      } finally {
        setIsFileUploading?.(false);
        setIsFileProcessing?.(false);
        abortControllerRef.current = null;
      }
    },
    [homePageDemo, qrDataToCreate, setQrDataToCreate, onFileIdReceived],
  );

  const scrollToFileItem = () => {
    setTimeout(() => {
      if (fileItemRef.current) {
        const scrollableContainer = fileItemRef.current.closest(
          '[class*="overflow-y-auto"]',
        ); // if inside the modal
        const rect = fileItemRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const stickyButtonsHeight = 70;

        if (scrollableContainer) {
          const containerRect = scrollableContainer.getBoundingClientRect();
          const relativeBottom = rect.bottom - containerRect.top;
          const containerVisibleHeight = containerRect.height;

          if (rect.bottom > viewportHeight - stickyButtonsHeight) {
            scrollableContainer.scrollBy({
              top:
                relativeBottom -
                (containerVisibleHeight - stickyButtonsHeight) +
                20,
              behavior: "smooth",
            });
          } else if (rect.top < containerRect.top) {
            scrollableContainer.scrollBy({
              top: rect.top - containerRect.top,
              behavior: "smooth",
            });
          }
        } else {
          if (rect.bottom > viewportHeight - stickyButtonsHeight) {
            window.scrollBy({
              top: rect.bottom - (viewportHeight - stickyButtonsHeight) + 20,
              behavior: "smooth",
            });
          } else if (rect.top < 0) {
            fileItemRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }
      }
    }, 100);
  };

  useEffect(() => {
    const hasFile = files.length > 0;
    const didFileJustAppear = hasFile && !hadFileBeforeRef.current;

    if (didFileJustAppear) {
      scrollToFileItem();
    }

    if (!hasFile) {
      setLocalFileError("");
    }

    hadFileBeforeRef.current = hasFile;
  }, [files]);

  return (
    <div className="flex w-full flex-col gap-2">
      <FileCardTitle title={title} isLogo={isLogo} />

      <FileUpload
        maxFiles={1}
        maxSize={maxFileSize}
        className="w-full max-w-xl"
        value={files}
        onValueChange={setFiles}
        onFileAccept={onFileAccept}
        onFileReject={onFileReject}
        onUpload={isLogo ? undefined : onUpload}
        accept={acceptedFileType}
        disabled={isFileUploading || isFileProcessing}
      >
        <FileUploadDropzone
          className={cn("border-secondary-100", {
            "border-red-500": fileError || localFileError,
          })}
        >
          {isLogo ? (
            <LogoDropzone />
          ) : (
            <FileDropzone title={title} maxFileSize={maxFileSize} />
          )}
        </FileUploadDropzone>
        <FileUploadList>
          {files.map((file, index) => (
            <FileUploadItem
              key={index}
              value={file}
              ref={(el) => {
                fileItemRef.current = el;
              }}
              className={cn("", {
                "flex-col": isEdit,
              })}
            >
              <div className="flex w-full items-center gap-2">
                <FileUploadItemPreview />
                <FileUploadItemMetadata />
                <FileUploadItemDelete asChild>
                  <Button variant="ghost" size="1" onClick={handleFileRemoval}>
                    <X className="stroke-neutral-200" />
                  </Button>
                </FileUploadItemDelete>
              </div>
              {!isLogo && <FileUploadItemProgress />}
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>

      <FileErrorMessage localFileError={localFileError} fileError={fileError} />
    </div>
  );
};
