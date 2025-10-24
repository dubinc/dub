"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Tag } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
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
    const [openAccordion, setOpenAccordion] = useState<string | undefined>("details");

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
        <form className="w-full">
          <Accordion
            type="single"
            collapsible
            value={openAccordion}
            onValueChange={(value) => setOpenAccordion(value as string | undefined)}
            className="w-full space-y-2"
          >
            <AccordionItem
              value="details"
              className="border-none rounded-[20px] px-4 bg-[#fbfbfb]"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-start gap-3 text-left">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Globe className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground text-base font-medium">
                      Website
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      Enter the website URL for your QR code
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              {openAccordion === "details" && <Separator className="mb-3" />}
              <AccordionContent className="pt-2 ">
                <BaseFormField
                  name="websiteLink"
                  label="Enter your website"
                  type="url"
                  placeholder={QR_INPUT_PLACEHOLDERS.WEBSITE_URL}
                  tooltip="This is the link people will open when they scan your QR code."
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="name"
              className="border-none rounded-[20px] px-4 bg-[#fbfbfb]"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-start gap-3 text-left">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Tag className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground text-base font-medium">
                      Name
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      Give your QR code a memorable name
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              {openAccordion === "name" && <Separator className="mb-3" />}
              <AccordionContent className="pt-2 ">
                <BaseFormField
                  name="qrName"
                  label="Name your QR Code"
                  placeholder={QR_NAME_PLACEHOLDERS.WEBSITE}
                  tooltip="Only you can see this. It helps you recognize your QR codes later."
                  initFromPlaceholder
                  className="w-full"
                  required={false}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </FormProvider>
    );
  },
);
