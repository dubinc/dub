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
import { ERROR_MESSAGES } from "@/ui/qr-builder/constants/errors.ts";
import { Button, Flex } from "@radix-ui/themes";
import { CloudUpload, Upload, X } from "lucide-react";
import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  EQRType,
  FILE_QR_TYPES,
  QR_TYPES,
} from "../constants/get-qr-config.ts";
import { getMaxSizeLabel } from "../helpers/get-max-size-label.ts";

const DEFAULT_FILE_LABEL = "Image";

interface IFileCardContentProps {
  qrType: (typeof FILE_QR_TYPES)[number];
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  fileError: string;
  setFileError: Dispatch<SetStateAction<string>>;
  title?: string;
  isLogo?: boolean;
}

export const FileCardContent: FC<IFileCardContentProps> = ({
  qrType,
  files,
  setFiles,
  fileError,
  setFileError,
  title,
  isLogo = false,
}) => {
  const { size, label } = getMaxSizeLabel(qrType, isLogo);
  const [acceptFileTypes, setAcceptFileTypes] = useState<string>("");

  useEffect(() => {
    const FILE_TYPE_MAP: Partial<Record<EQRType, string>> = {
      [EQRType.IMAGE]: "image/*",
      [EQRType.VIDEO]: "video/mp4",
      [EQRType.PDF]: "application/pdf",
    };

    setAcceptFileTypes(FILE_TYPE_MAP[qrType] || "");
  }, [qrType]);

  const qrTypeLabel =
    QR_TYPES.find((type) => type.id === qrType)?.label ?? DEFAULT_FILE_LABEL;

  const onFileReject = useCallback((file: File, message: string) => {
    setFileError(message);
  }, []);

  const handleFile = (files: File[]) => {
    setFiles(files);

    if (files.length > 0 && fileError === ERROR_MESSAGES.file.noFileUploaded) {
      setFileError("");
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <Flex gap="2" align="center">
        <h3 className="text-neutral text-sm font-medium">
          {title ?? `Upload your ${qrTypeLabel}`}
        </h3>
        {!isLogo && (
          <TooltipComponent
            tooltip={`People will be able to view this ${qrTypeLabel} when they scan your QR code.`}
          />
        )}
      </Flex>
      <FileUpload
        maxFiles={1}
        maxSize={size}
        className="w-full max-w-xl"
        value={files}
        onValueChange={handleFile}
        onFileReject={onFileReject}
        accept={acceptFileTypes}
        multiple={!isLogo}
      >
        <FileUploadDropzone className="border-secondary-100">
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
                  {`Drag & drop your ${qrTypeLabel}`}
                </p>
                <p className="text-xs text-neutral-800">
                  {`or click to browse (1 file, up to ${label})`}
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
            <FileUploadItem key={index} value={file}>
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

      {fileError && (
        <p className="text-xs font-medium text-red-500 md:text-sm">
          {fileError}
        </p>
      )}
    </div>
  );
};
