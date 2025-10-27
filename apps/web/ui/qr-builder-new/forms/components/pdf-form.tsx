"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_FILE_TITLES,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQrBuilderContext } from "../../context";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { TPdfQRFormData, pdfQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { FileUploadField } from "./file-upload-field";

export interface PdfFormRef {
  validate: () => Promise<boolean>;
  getValues: () => TPdfQRFormData & { encodedData: string; fileId?: string };
  form: UseFormReturn<TPdfQRFormData>;
}

interface PdfFormProps {
  onSubmit: (data: TPdfQRFormData & { encodedData: string; fileId?: string }) => void;
  defaultValues?: Partial<TPdfQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const PdfForm = forwardRef<PdfFormRef, PdfFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const [fileId, setFileId] = useState<string>(initialData?.fileId!);
    const { setIsFileUploading, setIsFileProcessing } = useQrBuilderContext();

    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.PDF,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: "",
      filesPDF: [],
      ...defaultValues,
    });

    const form = useForm<TPdfQRFormData>({
      resolver: zodResolver(pdfQRSchema),
      defaultValues: formDefaults,
    });

    // Update hidden fileId field when fileId state changes
    useEffect(() => {
      if (fileId) {
        form.setValue("fileId" as any, fileId);
      }
    }, [fileId, form]);

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
            placeholder={QR_NAME_PLACEHOLDERS.PDF}
            tooltip="Only you can see this. It helps you recognize your QR codes later."
            initFromPlaceholder
          />

          <FileUploadField
            title="PDF"
            name="filesPDF"
            label={QR_FILE_TITLES.PDF}
            accept="application/pdf"
            maxSize={20 * 1024 * 1024}
            onFileIdReceived={setFileId}
            onUploadStateChange={setIsFileUploading}
            onProcessingStateChange={setIsFileProcessing}
          />
        </form>
      </FormProvider>
    );
  },
);
