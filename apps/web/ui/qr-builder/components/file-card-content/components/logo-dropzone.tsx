import { FileUploadTrigger } from "@/ui/qr-builder/components/file-card-content/components/file-upload.tsx";
import { Button } from "@radix-ui/themes";
import { CloudUpload } from "lucide-react";
import { FC } from "react";

export const LogoDropzone: FC = () => {
  return (
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
  );
};
