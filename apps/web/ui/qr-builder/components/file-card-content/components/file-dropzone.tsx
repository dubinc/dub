import { FileUploadTrigger } from "@/ui/qr-builder/components/file-card-content/components/file-upload.tsx";
import { getMaxSizeLabel } from "@/ui/qr-builder/helpers/get-max-size-label.ts";
import { Button } from "@radix-ui/themes";
import { Upload } from "lucide-react";
import { FC } from "react";

interface IFileDropzoneProps {
  title?: string;
  maxFileSize: number;
}

export const FileDropzone: FC<IFileDropzoneProps> = ({
  title,
  maxFileSize,
}) => {
  return (
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
        <Button variant="solid" color="blue" size="2" className="mt-2 w-fit">
          Browse files
        </Button>
      </FileUploadTrigger>
    </>
  );
};
