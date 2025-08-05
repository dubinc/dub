import { FileCardContent } from "@/ui/qr-builder/components/file-card-content";
import { SUGGESTED_LOGOS } from "@/ui/qr-builder/constants/customization/logos.ts";
import { EAcceptedFileType } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { FC, useEffect, useRef } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { StylePicker } from "./style-picker.tsx";

const FILE_UPLOAD_FIELD_NAME = "fileUploadLogo";

interface LogoFormValues {
  fileUploadLogo: File[];
}

interface ILogoSelectorProps {
  isQrDisabled: boolean;
  selectedSuggestedLogo: string;
  onSuggestedLogoSelect: (type: string, iconSrc?: string) => void;
  onUploadLogo: (file: File | null) => void;
}

export const LogoSelector: FC<ILogoSelectorProps> = ({
  isQrDisabled,
  selectedSuggestedLogo,
  onSuggestedLogoSelect,
  onUploadLogo,
}) => {
  const methods = useForm<LogoFormValues>({
    defaultValues: {
      [FILE_UPLOAD_FIELD_NAME]: [],
    },
  });

  const { control, trigger } = methods;
  const uploadedLogoFiles = useWatch({ control, name: FILE_UPLOAD_FIELD_NAME });
  const previousFilesRef = useRef<File[]>([]);

  useEffect(() => {
    const lastFile = uploadedLogoFiles?.[uploadedLogoFiles.length - 1] || null;
    const previousLastFile =
      previousFilesRef.current?.[previousFilesRef.current.length - 1] || null;

    if (lastFile !== previousLastFile) {
      onUploadLogo(lastFile);
    }

    previousFilesRef.current = uploadedLogoFiles || [];
  }, [uploadedLogoFiles, onUploadLogo]);

  return (
    <div className="border-border-500 flex max-w-[540px] flex-col gap-4 rounded-lg border p-3">
      <StylePicker
        label="Select a logo"
        styleOptions={SUGGESTED_LOGOS}
        selectedStyle={selectedSuggestedLogo}
        onSelect={(type, icon) => {
          if (!isQrDisabled) {
            methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
            methods.trigger(FILE_UPLOAD_FIELD_NAME);
            onSuggestedLogoSelect(type, icon?.src);
          }
        }}
        optionsWrapperClassName={`${
          isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2"
      />
      <FormProvider {...methods}>
        <form>
          <Controller
            name={FILE_UPLOAD_FIELD_NAME}
            control={control}
            render={({
              field: { onChange, value = [] },
              fieldState: { error },
            }) => (
              <FileCardContent
                title="logo"
                files={value}
                setFiles={(files) => {
                  const incoming =
                    typeof files === "function" ? files(value) : files;
                  onChange(incoming);
                  trigger(FILE_UPLOAD_FIELD_NAME);
                  return incoming;
                }}
                fileError={error?.message || ""}
                isLogo
                acceptedFileType={EAcceptedFileType.IMAGE}
                maxFileSize={2 * 1024 * 1024}
              />
            )}
          />
        </form>
      </FormProvider>
    </div>
  );
};
