import { Button } from "@/components/ui/button";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
} from "../../components/file-upload";
import { getSortedLogos } from "../../constants/customization/logos";
import { useQrBuilderContext } from "../../context";
import { useFileUpload } from "../../hooks/use-file-upload";
import { ILogoData } from "../../types/customization";
import { StylePicker } from "./style-picker";

const FILE_UPLOAD_FIELD_NAME = "fileUploadLogo";
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

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
  const { setIsFileUploading, selectedQrType } = useQrBuilderContext();

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
      // Update logo data with fileId
      const lastFile = uploadedLogoFiles?.[uploadedLogoFiles.length - 1];
      if (lastFile) {
        const logoData = {
          type: "uploaded" as const,
          fileId,
          file: lastFile, // Keep file for preview
          id: undefined, // Clear suggested logo id
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

        // Set file temporarily (for preview) and reset suggested logo selection
        onLogoChange({
          type: "uploaded",
          file: lastFile,
          id: undefined, // Clear suggested logo id
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

    console.log("No logo selected, returning logo-none");
    return "logo-none";
  }, [logoData]);

  // Sort logos based on the selected QR type
  const sortedLogos = useMemo(() => {
    return getSortedLogos(selectedQrType);
  }, [selectedQrType]);

  // const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = Array.from(e.target.files || []);
  //   methods.setValue(FILE_UPLOAD_FIELD_NAME, files);
  //   methods.trigger(FILE_UPLOAD_FIELD_NAME);
  // }, [methods]);

  return (
    <motion.div
      layout
      className="flex max-w-[788px] w-full flex-col gap-4 pb-6"
    >
      <StylePicker
        label="Select a logo"
        styleOptions={sortedLogos}
        value={selectedStyle}
        onSelect={handleSuggestedLogoSelect}
        optionsWrapperClassName={`${isMobile ? "pb-2" : "pb-0"} ${
          disabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2"
        disabled={disabled}
      />

      <AnimatePresence>
        <FormProvider {...methods}>
          <form>
            <Controller
              name={FILE_UPLOAD_FIELD_NAME}
              control={control}
              render={({ field: { onChange, value }, fieldState }) => {
                const handleFileValidation = (file: File) => {
                  if (file.size > MAX_LOGO_FILE_SIZE) {
                    return `File too large. Maximum size is ${formatFileSize(MAX_LOGO_FILE_SIZE)}`;
                  }
                  if (!file.type.startsWith("image/")) {
                    return "Please select an image file";
                  }
                  return null;
                };

                const handleFileReject = (_file: File, message: string) => {
                  setUploadError(message);
                  toast.error(message);
                };

                const handleFileAccept = () => {
                  setUploadError(null);
                };

                const handleUpload = async (
                  files: File[],
                  {
                    onProgress,
                    onSuccess,
                    onError,
                  }: {
                    onProgress: (file: File, progress: number) => void;
                    onSuccess: (file: File) => void;
                    onError: (file: File, error: Error) => void;
                  },
                ) => {
                  try {
                    await Promise.all(
                      files.map(async (file: File) => {
                        try {
                          onProgress(file, 0);
                          await uploadFile(file);
                          onSuccess(file);
                        } catch (error) {
                          const err =
                            error instanceof Error
                              ? error
                              : new Error("Upload failed");
                          onError(file, err);
                          setUploadError(err.message);
                        }
                      }),
                    );
                  } catch (error) {
                    console.error("Upload error:", error);
                  }
                };

                return (
                  <>
                    <FileUpload
                      maxFiles={1}
                      maxSize={MAX_LOGO_FILE_SIZE}
                      className="w-full max-w-none"
                      value={value || []}
                      onValueChange={onChange}
                      onFileAccept={handleFileAccept}
                      onFileReject={handleFileReject}
                      onFileValidate={handleFileValidation}
                      onUpload={handleUpload}
                      accept="image/*"
                      disabled={disabled || isUploading}
                    >
                      <FileUploadDropzone
                        className={cn(
                          "border-border hover:border-secondary hover:bg-muted/30 w-full h-[140px] cursor-pointer py-12 px-6 transition-all duration-200",
                          {
                            "border-red-500 hover:border-red-500": fieldState.error || uploadError,
                          },
                        )}
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="border-border group-hover:border-secondary flex items-center justify-center rounded-full border p-3 transition-colors duration-200">
                            <Upload className="text-secondary size-5 transition-colors duration-200" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-neutral text-base font-medium">
                            Click to upload or drag & drop your logo
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Max size: {formatFileSize(MAX_LOGO_FILE_SIZE)} • .jpg, .png, .svg, etc.
                            </p>
                          </div>
                        </div>
                      </FileUploadDropzone>

                      <FileUploadList>
                        {(value || []).map((file: File, index: number) => (
                          <FileUploadItem key={index} value={file}>
                            <div className="flex w-full items-center gap-2">
                              <FileUploadItemPreview />
                              <FileUploadItemMetadata />
                              <FileUploadItemDelete asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onChange([]);
                                    trigger(FILE_UPLOAD_FIELD_NAME);
                                    // Reset logo to none
                                    onLogoChange({
                                      type: "none",
                                      id: undefined,
                                      file: undefined,
                                      fileId: undefined,
                                    });
                                  }}
                                >
                                  <X className="stroke-neutral-200" />
                                </Button>
                              </FileUploadItemDelete>
                            </div>
                            <FileUploadItemProgress />
                          </FileUploadItem>
                        ))}
                      </FileUploadList>
                    </FileUpload>

                    {(fieldState.error || uploadError) && (
                      <span className="text-sm text-red-500">
                        {fieldState.error?.message || uploadError}
                      </span>
                    )}
                  </>
                );
              }}
            />
          </form>
        </FormProvider>
      </AnimatePresence>
    </motion.div>
  );
};
