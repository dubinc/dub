"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle, Tag } from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_INPUT_PLACEHOLDERS,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { TWhatsappQRFormData, whatsappQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";

export interface WhatsAppFormRef {
  validate: () => Promise<boolean>;
  getValues: () => TWhatsappQRFormData & { encodedData: string };
  form: UseFormReturn<TWhatsappQRFormData>;
}

interface WhatsAppFormProps {
  onSubmit: (data: TWhatsappQRFormData & { encodedData: string }) => void;
  defaultValues?: Partial<TWhatsappQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
  };
}

export const WhatsAppForm = forwardRef<WhatsAppFormRef, WhatsAppFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const [openAccordion, setOpenAccordion] = useState<string | undefined>("details");

    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.WHATSAPP,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: "",
      number: "",
      message: "",
      ...defaultValues,
    });

    const form = useForm<TWhatsappQRFormData>({
      resolver: zodResolver(whatsappQRSchema),
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
                    <MessageCircle className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground text-base font-medium">
                      WhatsApp
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      Provide your WhatsApp number and optional message
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              {openAccordion === "details" && <Separator className="mb-3" />}
              <AccordionContent className="pt-2  space-y-4">
                <BaseFormField
                  name="number"
                  label="WhatsApp Number"
                  type="tel"
                  placeholder={QR_INPUT_PLACEHOLDERS.WHATSAPP_NUMBER}
                  tooltip="This is the number people will message on WhatsApp after scanning your QR code."
                />

                <BaseFormField
                  name="message"
                  label="Pre-typed Message"
                  type="textarea"
                  placeholder={QR_INPUT_PLACEHOLDERS.WHATSAPP_MESSAGE}
                  maxLength={160}
                  tooltip="This text will appear in the chat box — the user just needs to tap send."
                  required={false}
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
                  placeholder={QR_NAME_PLACEHOLDERS.WHATSAPP}
                  tooltip="Only you can see this. It helps you recognize your QR codes later."
                  initFromPlaceholder
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
