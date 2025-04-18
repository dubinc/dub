import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { Dispatch, FC, SetStateAction } from "react";
import {
  EQRType,
  FILE_QR_TYPES,
} from "../../../../../(public)/landing/constants/get-qr-config.ts";
import { useFilePreview } from "../use-file-preview.hook.ts";
import { getMaxSizeLabel } from "../utils.ts";

interface IFileCardContentProps {
  qrType: (typeof FILE_QR_TYPES)[number];
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  title?: string;
  multiple?: boolean;
  minimumFlow?: boolean;
  isLogo?: boolean;
}
export const FileCardContent: FC<IFileCardContentProps> = ({
  qrType,
  files,
  setFiles,
  title,
  multiple = true,
  minimumFlow = false,
  isLogo = false,
}) => {
  const {
    fileInputRef,
    dropzoneRef,
    acceptFileTypes,
    filePreviews,
    handleFileChange,
    handleDeleteFile,
    handleUploadClick,
    errorMessage,
  } = useFilePreview(qrType, files, setFiles, multiple);

  const isImageOrVideoFile =
    qrType === EQRType.IMAGE || qrType === EQRType.VIDEO;
  const fileTypeLabel =
    qrType === EQRType.IMAGE
      ? multiple
        ? "Image(s)"
        : "Image"
      : qrType === EQRType.VIDEO
        ? "Video(s)"
        : "PDF(s)";
  const { label } = getMaxSizeLabel(qrType, isLogo);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col items-start gap-2">
        <h3 className="text-neutral text-sm font-medium">
          {title ??
            (isImageOrVideoFile
              ? `Upload one or more ${qrType}s`
              : "Add one or more files")}
        </h3>
        <div
          ref={dropzoneRef}
          role="button"
          className={cn(
            "border-secondary flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 md:min-h-[128px]",
            {
              "h-[50px] flex-row-reverse justify-start px-1 md:min-h-[50px]":
                minimumFlow,
              "justify-between pl-3 pr-0": isLogo,
            },
          )}
          onClick={handleUploadClick}
        >
          <input
            name="files"
            ref={fileInputRef}
            accept={acceptFileTypes}
            multiple={multiple}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="primary"
            className={cn(
              "bg-secondary hover:bg-secondary/90 h-9 max-w-[140px] rounded-md border-none px-6 py-[6px] text-xs font-medium text-white hover:ring-0 md:max-w-[160px] md:py-2 md:text-sm",
              {
                "bg-secondary-100 text-secondary hover:bg-secondary-100/90 h-[48px] w-[100px] rounded-l-none":
                  isLogo,
              },
            )}
            text={isLogo ? "Browse" : `Upload ${fileTypeLabel}`}
          />
          <p className="text-xs font-normal text-neutral-200 md:text-sm">
            {minimumFlow
              ? `Drag and drop or click to upload a logo (${label} max)`
              : `Maximum size: ${label}`}
          </p>

          {errorMessage && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <motion.div
          layout
          className="mt-4 flex flex-col gap-3"
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <AnimatePresence mode="popLayout">
            {files.map((file, index) => {
              const preview = filePreviews[index];
              return (
                <motion.div
                  key={file.name + index}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    marginTop: 0,
                    marginBottom: 0,
                  }}
                  transition={{
                    opacity: { duration: 0.2 },
                    height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                    paddingTop: { duration: 0.4 },
                    paddingBottom: { duration: 0.4 },
                    marginTop: { duration: 0.4 },
                    marginBottom: { duration: 0.4 },
                  }}
                  className="flex items-center gap-3 overflow-hidden rounded-md border bg-white px-4 py-3"
                >
                  <motion.div
                    layout
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {preview &&
                      (preview.startsWith("pdf") ? (
                        <Icon
                          icon="hugeicons:pdf-02"
                          className="h-[35px] w-[35px] text-neutral-200"
                        />
                      ) : file.type.startsWith("video/") ? (
                        <video
                          className="h-full w-full object-cover"
                          src={preview}
                        />
                      ) : (
                        <img
                          src={preview}
                          alt={`Preview ${index}`}
                          className="h-full w-full object-cover"
                        />
                      ))}
                  </motion.div>

                  <span className="w-40 truncate text-sm font-medium leading-normal text-gray-700">
                    {file.name}
                  </span>
                  <Icon
                    role="button"
                    icon="mage:trash"
                    className="ml-auto shrink-0 cursor-pointer text-[20px] text-gray-500 hover:text-red-500"
                    onClick={() => handleDeleteFile(index)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
