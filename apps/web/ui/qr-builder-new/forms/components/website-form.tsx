"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_INPUT_PLACEHOLDERS,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { TWebsiteQRFormData, websiteQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";

export interface WebsiteFormRef {
  validate: () => Promise<boolean>;
  getValues: () => TWebsiteQRFormData & { encodedData: string };
  form: UseFormReturn<TWebsiteQRFormData>;
}

interface WebsiteFormProps {
  onSubmit: (data: TWebsiteQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<TWebsiteQRFormData>;
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
      qrName: "",
      websiteLink: "",
      ...defaultValues,
    });

    const form = useForm<TWebsiteQRFormData>({
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
        <form className="flex w-full flex-col gap-4">
          <BaseFormField
            name="qrName"
            label="Name your QR Code"
            placeholder={QR_NAME_PLACEHOLDERS.WEBSITE}
            tooltip="Only you can see this. It helps you recognize your QR codes later."
            initFromPlaceholder
          />

          <BaseFormField
            name="websiteLink"
            label="Enter your website"
            type="url"
            placeholder={QR_INPUT_PLACEHOLDERS.WEBSITE_URL}
            tooltip="This is the link people will open when they scan your QR code."
          />
        </form>
      </FormProvider>
    );
  },
);
