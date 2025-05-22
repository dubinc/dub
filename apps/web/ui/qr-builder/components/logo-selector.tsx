import { SUGGESTED_LOGOS } from "@/ui/qr-builder/constants/customization/logos.ts";
import { Dispatch, FC, SetStateAction } from "react";
import { EQRType } from "../constants/get-qr-config.ts";
import { FileCardContent } from "./file-card-content.tsx";
import { StylePicker } from "./style-picker.tsx";

interface ILogoSelectorProps {
  isQrDisabled: boolean;
  selectedSuggestedLogo: string;
  uploadedLogo: File | null;
  onSuggestedLogoSelect: (type: string, iconSrc?: string) => void;
  onUploadLogo: (file: File | null) => void;
  fileError: string;
  setFileError: Dispatch<SetStateAction<string>>;
}

export const LogoSelector: FC<ILogoSelectorProps> = ({
  isQrDisabled,
  selectedSuggestedLogo,
  uploadedLogo,
  onSuggestedLogoSelect,
  onUploadLogo,
  fileError,
  setFileError,
}) => {
  return (
    <div className="border-border-500 flex max-w-[540px] flex-col gap-4 rounded-lg border p-3">
      <StylePicker
        label="Select a logo"
        styleOptions={SUGGESTED_LOGOS}
        selectedStyle={selectedSuggestedLogo}
        onSelect={(type, icon) => {
          if (!isQrDisabled) {
            onSuggestedLogoSelect(type, icon?.src);
          }
        }}
        optionsWrapperClassName={`${
          isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        stylePickerWrapperClassName="[&_label]:text-sm"
        styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2"
      />
      <FileCardContent
        qrType={EQRType.IMAGE}
        files={uploadedLogo ? [uploadedLogo] : []}
        setFiles={(files) => {
          const incoming = typeof files === "function" ? files([]) : files;
          const file = incoming[incoming.length - 1] || null;
          onUploadLogo(file);
          return file ? [file] : [];
        }}
        fileError={fileError}
        setFileError={setFileError}
        title="Upload your logo"
        isLogo
      />
    </div>
  );
};
