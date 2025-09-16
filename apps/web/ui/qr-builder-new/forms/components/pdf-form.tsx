"use client";

import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pdfQRSchema, PdfQRFormData } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { FileUploadField } from "./file-upload-field";
import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { QR_NAME_PLACEHOLDERS, QR_FILE_TITLES } from "../../constants/qr-type-inputs-placeholders";
import { EQRType } from "../../constants/get-qr-config";
import { useQRFormData } from "../../hooks/use-qr-form-data";

export interface PdfFormRef {
  validate: () => Promise<boolean>;
  getValues: () => PdfQRFormData & { encodedData: string };
  form: UseFormReturn<PdfQRFormData>;
}

interface PdfFormProps {
  onSubmit: (data: PdfQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<PdfQRFormData>;
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
    
    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.PDF,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: QR_NAME_PLACEHOLDERS.PDF,
      filesPDF: [],
      ...defaultValues,
    });

    const form = useForm<PdfQRFormData>({
      resolver: zodResolver(pdfQRSchema),
      defaultValues: formDefaults,
    });

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
            placeholder={QR_NAME_PLACEHOLDERS.PDF}
            tooltip="Only you can see this. It helps you recognize your QR codes later."
          />
          
          <FileUploadField
            name="filesPDF"
            label={QR_FILE_TITLES.PDF}
            accept="application/pdf"
            maxSize={20 * 1024 * 1024}
            onFileIdReceived={setFileId}
          />
        </form>
      </div>
    </FormProvider>
  );
});