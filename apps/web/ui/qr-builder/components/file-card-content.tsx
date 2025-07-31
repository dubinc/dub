import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/ui/qr-builder/components/file-upload.tsx";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import { DEFAULT_QR_BUILDER_DATA } from "@/ui/qr-builder/constants/customization/qr-builder-data.ts";
import { EAcceptedFileType } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { getMaxSizeLabel } from "@/ui/qr-builder/helpers/get-max-size-label.ts";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { FileUploadProps, useLocalStorage } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { Button, Flex } from "@radix-ui/themes";
import { CloudUpload, Upload, X } from "lucide-react";
import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { uploadFileWithProgress } from "../helpers/upload-file-with-progress";

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
  isUploading?: boolean;
  setIsUploading?: Dispatch<SetStateAction<boolean>>;
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
  isUploading = false,
  setIsUploading,
}) => {
  const [localFileError, setLocalFileError] = useState<string>("");
  const fileItemRef = useRef<HTMLDivElement | null>(null);
  const hadFileBeforeRef = useRef<boolean>(false);
  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const onFileReject = (file: File, message: string) => {
    setLocalFileError(message);
  };

  const onFileAccept = (file: File) => {
    setLocalFileError("");
  };

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (files: File[], { onProgress, onSuccess, onError }) => {
      setIsUploading?.(true);
      try {
        await Promise.all(
          files.map(async (file: File) => {
            try {
              onProgress(file, 0);

              const result = await uploadFileWithProgress(file, onProgress);

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
        setIsUploading?.(false);
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
      <Flex gap="2" align="center">
        <h3 className="text-neutral text-sm font-medium">{`Upload your ${title}`}</h3>
        {!isLogo && (
          <TooltipComponent
            tooltip={`People will be able to view this ${title} when they scan your QR code.`}
          />
        )}
      </Flex>

      <FileUpload
        maxFiles={1}
        maxSize={maxFileSize}
        className="w-full max-w-xl"
        value={files}
        onValueChange={setFiles}
        onFileAccept={onFileAccept}
        onFileReject={onFileReject}
        onUpload={onUpload}
        accept={acceptedFileType}
        disabled={isUploading}
      >
        <FileUploadDropzone
          className={cn("border-secondary-100", {
            "border-red-500": fileError || localFileError,
          })}
        >
          {isLogo ? (
            <div className="flex flex-row flex-wrap items-center gap-2 border-dotted text-center">
              <CloudUpload className="text-secondary size-5" />
              Drag and drop or
              <FileUploadTrigger asChild>
                <Button variant="outline" size="1" className="p-0">
                  choose files
                </Button>
              </FileUploadTrigger>
              to upload
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="border-secondary-100 flex items-center justify-center rounded-full border p-2.5">
                  <Upload className="text-secondary size-6" />
                </div>
                <p className="text-neutral text-sm font-medium">
                  {`Drag & drop your ${title}`}
                </p>
                <p className="text-xs text-neutral-800">
                  {`or click to browse (1 file, up to ${getMaxSizeLabel(maxFileSize)})`}
                </p>
              </div>
              <FileUploadTrigger asChild>
                <Button
                  variant="solid"
                  color="blue"
                  size="2"
                  className="mt-2 w-fit"
                >
                  Browse files
                </Button>
              </FileUploadTrigger>
            </>
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
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => {
                      setFiles([]);
                    }}
                  >
                    <X className="stroke-neutral-200" />
                  </Button>
                </FileUploadItemDelete>
              </div>
              <FileUploadItemProgress />
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>

      {(localFileError || fileError) && (
        <p className="text-xs font-medium text-red-500 md:text-sm">
          {localFileError || fileError}
        </p>
      )}
    </div>
  );
};
