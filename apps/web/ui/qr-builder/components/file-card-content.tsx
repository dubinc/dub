import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/ui/qr-builder/components/file-upload.tsx";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import { EAcceptedFileType } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { getMaxSizeLabel } from "@/ui/qr-builder/helpers/get-max-size-label.ts";
import { cn } from "@dub/utils/src";
import { Button, Flex } from "@radix-ui/themes";
import { CloudUpload, Upload, X } from "lucide-react";
import {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

interface IFileCardContentProps {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  acceptedFileType: EAcceptedFileType;
  maxFileSize: number;
  fileError: string;
  title?: string;
  isLogo?: boolean;
}

export const FileCardContent: FC<IFileCardContentProps> = ({
  files,
  setFiles,
  acceptedFileType,
  maxFileSize,
  fileError,
  title,
  isLogo = false,
}) => {
  const [localFileError, setLocalFileError] = useState<string>("");
  const fileItemRef = useRef<HTMLDivElement | null>(null);
  const hadFileBeforeRef = useRef<boolean>(false);

  const onFileReject = (file: File, message: string) => {
    setLocalFileError(message);
  };

  const onFileAccept = (file: File) => {
    setLocalFileError("");
  };

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
        accept={acceptedFileType}
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
            >
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button variant="ghost" size="1">
                  <X className="stroke-neutral-200" />
                </Button>
              </FileUploadItemDelete>
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
