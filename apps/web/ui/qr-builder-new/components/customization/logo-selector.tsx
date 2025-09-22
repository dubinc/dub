import { cn } from "@dub/utils";
import { FC, useEffect, useRef, useCallback } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { SUGGESTED_LOGOS } from "../../constants/customization/logos";
import { LogoData } from "../../types/customization";
import { StylePicker } from "./style-picker";

const FILE_UPLOAD_FIELD_NAME = "fileUploadLogo";

interface LogoFormValues {
  fileUploadLogo: File[];
}

interface LogoSelectorProps {
  logoData: LogoData;
  onLogoChange: (logoData: LogoData) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const LogoSelector: FC<LogoSelectorProps> = ({
  logoData,
  onLogoChange,
  disabled = false,
  isMobile = false,
}) => {
  const methods = useForm<LogoFormValues>({
    defaultValues: {
      [FILE_UPLOAD_FIELD_NAME]: logoData.file ? [logoData.file] : [],
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
      if (lastFile) {
        onLogoChange({
          type: "uploaded",
          file: lastFile,
        });
      } else {
        onLogoChange({
          type: "none",
        });
      }
    }

    previousFilesRef.current = uploadedLogoFiles || [];
  }, [uploadedLogoFiles, onLogoChange]);

  const handleSuggestedLogoSelect = useCallback((logoId: string) => {
    if (logoId === "logo-none") {
      onLogoChange({
        type: "none",
      });
    } else {
      onLogoChange({
        type: "suggested",
        id: logoId,
      });
    }
    
    // Clear uploaded files when selecting a suggested logo
    methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
    methods.trigger(FILE_UPLOAD_FIELD_NAME);
  }, [onLogoChange, methods]);

  const getSelectedStyle = useCallback(() => {
    if (logoData.type === "suggested" && logoData.id) {
      return logoData.id;
    }
    return "logo-none";
  }, [logoData]);

  // const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = Array.from(e.target.files || []);
  //   methods.setValue(FILE_UPLOAD_FIELD_NAME, files);
  //   methods.trigger(FILE_UPLOAD_FIELD_NAME);
  // }, [methods]);

  return (
    <div 
      className={cn("flex max-w-[540px] flex-col gap-4", {
        "border-border-500 rounded-lg border p-3": !isMobile,
      })}
    >
      <StylePicker
        label="Select a logo"
        styleOptions={SUGGESTED_LOGOS}
        selectedStyle={getSelectedStyle()}
        onSelect={handleSuggestedLogoSelect}
        optionsWrapperClassName={`${
          disabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2"
        disabled={disabled}
      />
      
      {/* TODO QR_BUILDER_NEW: File upload component for logo upload */}
      {/* This will be implemented when file upload functionality is ready */}
      <FormProvider {...methods}>
        <form>
          <Controller
            name={FILE_UPLOAD_FIELD_NAME}
            control={control}
            render={({
              field: { onChange, value = [] },
              fieldState: { error },
            }) => (
              <div className="border-border-500 rounded-lg border-2 border-dashed p-4 text-center">
                <p className="text-sm text-gray-500">
                  {disabled 
                    ? "Logo upload disabled" 
                    : "Logo upload feature coming soon"
                  }
                </p>
                {/* TODO QR_BUILDER_NEW: Replace with actual FileCardContent when ready */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    onChange(files);
                    trigger(FILE_UPLOAD_FIELD_NAME);
                  }}
                  disabled={disabled}
                  className="mt-2"
                />
              </div>
            )}
          />
        </form>
      </FormProvider>
    </div>
  );
};