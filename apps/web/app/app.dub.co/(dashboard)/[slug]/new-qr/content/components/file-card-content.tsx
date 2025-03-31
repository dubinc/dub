import { Button } from "@dub/ui";
import { Icon } from "@iconify/react";
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
}
export const FileCardContent: FC<IFileCardContentProps> = ({
  qrType,
  files,
  setFiles,
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
  } = useFilePreview(qrType, files, setFiles);

  const isImageOrVideoFile =
    qrType === EQRType.IMAGE || qrType === EQRType.VIDEO;
  const fileTypeLabel =
    qrType === EQRType.IMAGE
      ? "Image(s)"
      : qrType === EQRType.VIDEO
        ? "Video(s)"
        : "PDF(s)";
  const { label } = getMaxSizeLabel(qrType);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col items-start gap-2">
        <h3 className="text-neutral text-sm font-medium">
          {isImageOrVideoFile
            ? `Upload one or more ${qrType}s`
            : "Add one or more files"}
        </h3>
        <div
          ref={dropzoneRef}
          role="button"
          className="border-secondary flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 md:min-h-[128px]"
          onClick={handleUploadClick}
        >
          <input
            name="files"
            ref={fileInputRef}
            accept={acceptFileTypes}
            multiple
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="primary"
            className="bg-secondary hover:bg-secondary/90 h-9 max-w-[140px] rounded-md border-none px-6 py-[6px] text-xs font-medium text-white hover:ring-0 md:max-w-[160px] md:py-2 md:text-sm"
            text={`Upload ${fileTypeLabel}`}
          />
          <p className="text-xs font-normal text-neutral-200 md:text-sm">
            Maximum size: {label}
          </p>

          {errorMessage && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-md border px-4 py-3"
            >
              {filePreviews.length > index && (
                <div className="flex flex-wrap gap-4">
                  <div
                    key={index}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md"
                  >
                    {filePreviews[index].startsWith("pdf") ? (
                      <Icon
                        icon="hugeicons:pdf-02"
                        className="h-[35px] w-[35px] text-neutral-200"
                      />
                    ) : files[index].type.startsWith("video/") ? (
                      <video
                        className="h-full w-full object-cover"
                        src={filePreviews[index]}
                      />
                    ) : (
                      <img
                        src={filePreviews[index]}
                        alt={`Preview ${index}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>
              )}
              <span className="truncate text-sm font-medium text-gray-700">
                {file.name}
              </span>
              <Icon
                role="button"
                icon="mage:trash"
                className="ml-auto shrink-0 cursor-pointer text-[20px] text-gray-500 hover:text-red-500"
                onClick={() => handleDeleteFile(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
