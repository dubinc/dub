import { cn } from "@dub/utils";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { SUGGESTED_LOGOS } from "../../constants/customization/logos";
import { useQrBuilderContext } from "../../context";
import { useFileUpload } from "../../hooks/use-file-upload";
import { ILogoData } from "../../types/customization";
import { StylePicker } from "./style-picker";

const FILE_UPLOAD_FIELD_NAME = "fileUploadLogo";
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface LogoFormValues {
  fileUploadLogo: File[];
}

interface LogoSelectorProps {
  logoData: ILogoData;
  onLogoChange: (logoData: ILogoData) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const LogoSelector: FC<LogoSelectorProps> = ({
  logoData,
  onLogoChange,
  disabled = false,
  isMobile = false,
}) => {
  const { setIsFileUploading } = useQrBuilderContext();

  const methods = useForm<LogoFormValues>({
    defaultValues: {
      [FILE_UPLOAD_FIELD_NAME]: logoData.file ? [logoData.file] : [],
    },
  });

  const { control, trigger } = methods;
  const uploadedLogoFiles = useWatch({ control, name: FILE_UPLOAD_FIELD_NAME });
  const previousFilesRef = useRef<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // File upload hook
  const { uploadFile, isUploading, uploadProgress } = useFileUpload({
    onFileIdReceived: (fileId) => {
      console.log("=== Logo fileId received ===", fileId);
      // Update logo data with fileId
      const lastFile = uploadedLogoFiles?.[uploadedLogoFiles.length - 1];
      if (lastFile) {
        const logoData = {
          type: "uploaded" as const,
          fileId,
          file: lastFile, // Keep file for preview
        };
        console.log("Updating logo with:", logoData);
        onLogoChange(logoData);
      }
      setUploadError(null);
    },
    onError: (file, error) => {
      setUploadError(error);
      toast.error(`Logo upload failed: ${error}`);
      // Clear the file from form
      methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
    },
  });

  // Sync logo upload state to context
  useEffect(() => {
    setIsFileUploading(isUploading);
  }, [isUploading, setIsFileUploading]);

  useEffect(() => {
    const lastFile = uploadedLogoFiles?.[uploadedLogoFiles.length - 1] || null;
    const previousLastFile =
      previousFilesRef.current?.[previousFilesRef.current.length - 1] || null;

    if (lastFile !== previousLastFile) {
      if (lastFile) {
        // Validate file size
        if (lastFile.size > MAX_LOGO_FILE_SIZE) {
          toast.error("Logo file size must be less than 5MB");
          methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
          return;
        }

        // Validate file type
        if (!lastFile.type.startsWith("image/")) {
          toast.error("Please select an image file");
          methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
          return;
        }

        // Set file temporarily (for preview)
        onLogoChange({
          type: "uploaded",
          file: lastFile,
        });

        // Upload file to get fileId
        uploadFile(lastFile).catch((error) => {
          console.error("Logo upload error:", error);
        });
      } else {
        onLogoChange({
          type: "none",
          id: undefined,
          file: undefined,
          fileId: undefined,
        });
      }
    }

    previousFilesRef.current = uploadedLogoFiles || [];
  }, [uploadedLogoFiles, onLogoChange, uploadFile, methods]);

  const handleSuggestedLogoSelect = useCallback(
    (logoId: string, icon?: any) => {
      if (logoId === "logo-none") {
        onLogoChange({
          type: "none",
          id: undefined,
          file: undefined,
        });
      } else {
        onLogoChange({
          type: "suggested",
          id: logoId,
          iconSrc: icon?.src, // Store the icon src for direct use
        });
      }

      // Clear uploaded files when selecting a suggested logo
      methods.setValue(FILE_UPLOAD_FIELD_NAME, []);
      methods.trigger(FILE_UPLOAD_FIELD_NAME);
    },
    [onLogoChange, methods],
  );

  const selectedStyle = useMemo(() => {
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
        value={selectedStyle}
        onSelect={handleSuggestedLogoSelect}
        optionsWrapperClassName={`${
          disabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2"
        disabled={disabled}
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
              <div className="flex flex-col gap-2">
                <div
                  className={cn(
                    "border-border-500 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                    disabled && "pointer-events-none opacity-50",
                    isUploading && "border-blue-500 bg-blue-50",
                  )}
                >
                  {value.length > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={URL.createObjectURL(value[0])}
                        alt="Uploaded logo"
                        className="h-16 w-16 object-contain"
                      />
                      <p className="text-sm text-gray-700">{value[0].name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          onChange([]);
                          trigger(FILE_UPLOAD_FIELD_NAME);
                        }}
                        disabled={isUploading}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-gray-600">
                        Upload your logo (max 5MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          onChange(files);
                          trigger(FILE_UPLOAD_FIELD_NAME);
                        }}
                        disabled={disabled || isUploading}
                        className="text-sm"
                      />
                    </>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && uploadProgress.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {uploadProgress[0].status === "uploading"
                          ? "Uploading..."
                          : "Processing..."}
                      </span>
                      <span>{uploadProgress[0].progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress[0].progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Error */}
                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}

                {/* Form Error */}
                {error && (
                  <p className="text-xs text-red-600">{error.message}</p>
                )}
              </div>
            )}
          />
        </form>
      </FormProvider>
    </div>
  );
};
