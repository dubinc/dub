"use client";

import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { websiteQRSchema, WebsiteQRFormData } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import { QR_NAME_PLACEHOLDERS, QR_INPUT_PLACEHOLDERS } from "../../constants/qr-type-inputs-placeholders";
import { EQRType } from "../../constants/get-qr-config";
import { useQRFormData } from "../../hooks/use-qr-form-data";

export interface WebsiteFormRef {
  validate: () => Promise<boolean>;
  getValues: () => WebsiteQRFormData & { encodedData: string };
  form: UseFormReturn<WebsiteQRFormData>;
}

interface WebsiteFormProps {
  onSubmit: (data: WebsiteQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<WebsiteQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
  };
}

export const WebsiteForm = forwardRef<WebsiteFormRef, WebsiteFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.WEBSITE,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: QR_NAME_PLACEHOLDERS.WEBSITE,
      websiteLink: "",
      ...defaultValues,
    });

    const form = useForm<WebsiteQRFormData>({
      resolver: zodResolver(websiteQRSchema),
      defaultValues: formDefaults,
    });

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        const newDefaults = getDefaultValues(defaultValues);
        form.reset(newDefaults);
      }
    }, [initialData, getDefaultValues, defaultValues, form]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        const result = await form.trigger();
        if (result) {
          const formData = form.getValues();
          const encodedData = encodeFormData(formData);
          onSubmit({ ...formData, encodedData });
        }
        return result;
      },
      getValues: () => {
        const formData = form.getValues();
        const encodedData = encodeFormData(formData);
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
              placeholder={QR_NAME_PLACEHOLDERS.WEBSITE}
              tooltip="Only you can see this. It helps you recognize your QR codes later."
            />
            
            <BaseFormField
              name="websiteLink"
              label="Enter your website"
              type="url"
              placeholder={QR_INPUT_PLACEHOLDERS.WEBSITE_URL}
              tooltip="This is the link people will open when they scan your QR code."
            />
          </form>
        </div>
      </FormProvider>
    );
  }
);