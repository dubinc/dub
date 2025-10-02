"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_FILE_TITLES,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { ImageQRFormData, imageQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { FileUploadField } from "./file-upload-field";
import { useQrBuilderContext } from "../../context";

export interface ImageFormRef {
  validate: () => Promise<boolean>;
  getValues: () => ImageQRFormData & { encodedData: string };
  form: UseFormReturn<ImageQRFormData>;
}

interface ImageFormProps {
  onSubmit: (data: ImageQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<ImageQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const ImageForm = forwardRef<ImageFormRef, ImageFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const [fileId, setFileId] = useState<string>(initialData?.fileId!);
    const { setIsFileUploading, setIsFileProcessing } = useQrBuilderContext();

    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.IMAGE,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: "",
      filesImage: [],
      ...defaultValues,
    });

    const form = useForm<ImageQRFormData>({
      resolver: zodResolver(imageQRSchema),
      defaultValues: formDefaults,
    });

    // Update hidden fileId field when fileId state changes
    useEffect(() => {
      if (fileId) {
        form.setValue('fileId' as any, fileId);
      }
    }, [fileId, form]);

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        const newDefaults = getDefaultValues(defaultValues);
        form.reset(newDefaults);
        setFileId(initialData?.fileId!);
      }
    }, [initialData, getDefaultValues, defaultValues, form]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        const result = await form.trigger();
        if (result) {
          const formData = form.getValues();
          const encodedData = encodeFormData(formData, fileId);
          onSubmit({ ...formData, encodedData, fileId });
        }
        return result;
      },
      getValues: () => {
        const formData = form.getValues();
        const encodedData = encodeFormData(formData, fileId);
        return { ...formData, encodedData, fileId };
      },
      form,
    }));

    return (
      <FormProvider {...form}>
        <form className="flex w-full flex-col gap-4">
          <BaseFormField
            name="qrName"
            label="Name your QR Code"
            placeholder={QR_NAME_PLACEHOLDERS.IMAGE}
            tooltip="Only you can see this. It helps you recognize your QR codes later."
            initFromPlaceholder
          />

          <FileUploadField
            title="Image"
            name="filesImage"
            label={QR_FILE_TITLES.IMAGE}
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            onFileIdReceived={setFileId}
            onUploadStateChange={setIsFileUploading}
            onProcessingStateChange={setIsFileProcessing}
          />
        </form>
      </FormProvider>
    );
  },
);
