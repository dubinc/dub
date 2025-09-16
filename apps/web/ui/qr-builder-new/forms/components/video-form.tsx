"use client";

import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { videoQRSchema, VideoQRFormData } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { FileUploadField } from "./file-upload-field";
import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { QR_NAME_PLACEHOLDERS, QR_FILE_TITLES } from "../../constants/qr-type-inputs-placeholders";
import { EQRType } from "../../constants/get-qr-config";
import { useQRFormData } from "../../hooks/use-qr-form-data";

export interface VideoFormRef {
  validate: () => Promise<boolean>;
  getValues: () => VideoQRFormData & { encodedData: string };
  form: UseFormReturn<VideoQRFormData>;
}

interface VideoFormProps {
  onSubmit: (data: VideoQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<VideoQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const VideoForm = forwardRef<VideoFormRef, VideoFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const [fileId, setFileId] = useState<string>(initialData?.fileId);
    
    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.VIDEO,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: QR_NAME_PLACEHOLDERS.VIDEO,
      filesVideo: [],
      ...defaultValues,
    });

    const form = useForm<VideoQRFormData>({
      resolver: zodResolver(videoQRSchema),
      defaultValues: formDefaults,
    });

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        const newDefaults = getDefaultValues(defaultValues);
        form.reset(newDefaults);
        setFileId(initialData.fileId);
      }
    }, [initialData, getDefaultValues, defaultValues, form]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        const result = await form.trigger();
        if (result) {
          const formData = form.getValues();
          const encodedData = encodeFormData(formData, fileId);
          onSubmit({ ...formData, encodedData });
        }
        return result;
      },
      getValues: () => {
        const formData = form.getValues();
        const encodedData = encodeFormData(formData, fileId);
        return { ...formData, encodedData };
      },
      form,
    }));

    return (
      <FormProvider {...form}>
        <div className="border-border-100 flex h-fit w-full flex-col items-center justify-center gap-6 rounded-lg border p-3 md:max-w-[524px] md:px-6 md:py-4">
          <form className="flex w-full flex-col gap-4">
            <BaseFormField
              name="qrName"
              label="Name your QR Code"
              placeholder={QR_NAME_PLACEHOLDERS.VIDEO}
              tooltip="Only you can see this. It helps you recognize your QR codes later."
            />
            
            <FileUploadField
              name="filesVideo"
              label={QR_FILE_TITLES.VIDEO}
              accept="video/*"
              maxSize={50 * 1024 * 1024}
              onFileIdReceived={setFileId}
            />
          </form>
        </div>
      </FormProvider>
    );
  }
);