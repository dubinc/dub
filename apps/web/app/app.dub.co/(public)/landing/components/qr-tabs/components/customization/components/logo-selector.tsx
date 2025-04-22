import { StylePicker } from "app/app.dub.co/(dashboard)/[slug]/new-qr/customization/components/style-picker";
import { SUGGESTED_LOGOS } from "app/app.dub.co/(dashboard)/[slug]/new-qr/customization/constants";
import { FC } from "react";
import { FileCardContent } from "../../../../../../../(dashboard)/[slug]/new-qr/content/components/file-card-content.tsx";
import { EQRType } from "../../../../../constants/get-qr-config.ts";

interface ILogoSelectorProps {
  isQrDisabled: boolean;
  selectedSuggestedLogo: string;
  uploadedLogo: File | null;
  onSuggestedLogoSelect: (type: string, iconSrc?: string) => void;
  onUploadLogo: (file: File | null) => void;
}

export const LogoSelector: FC<ILogoSelectorProps> = ({
  isQrDisabled,
  selectedSuggestedLogo,
  uploadedLogo,
  onSuggestedLogoSelect,
  onUploadLogo,
}) => {
  return (
    <div className="border-border-100 flex max-w-[680px] flex-col gap-4 rounded-lg border p-3">
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
        styleButtonClassName="[&_img]:h-5 [&_img]:w-5 p-3.5"
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
        title="Upload your logo"
        multiple={false}
        minimumFlow
        isLogo
      />
    </div>
  );
};
