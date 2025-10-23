"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, Video as VideoIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { EQRType } from "../../constants/get-qr-config";
import {
  QR_FILE_TITLES,
  QR_NAME_PLACEHOLDERS,
} from "../../constants/qr-type-inputs-placeholders";
import { useQrBuilderContext } from "../../context";
import { useQRFormData } from "../../hooks/use-qr-form-data";
import { TVideoQRFormData, videoQRSchema } from "../../validation/schemas";
import { BaseFormField } from "./base-form-field.tsx";
import { FileUploadField } from "./file-upload-field";

export interface VideoFormRef {
  validate: () => Promise<boolean>;
  getValues: () => TVideoQRFormData & { encodedData: string; fileId?: string };
  form: UseFormReturn<TVideoQRFormData>;
}

interface VideoFormProps {
  onSubmit: (data: TVideoQRFormData & { encodedData: string; fileId?: string }) => void;
  defaultValues?: Partial<TVideoQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const VideoForm = forwardRef<VideoFormRef, VideoFormProps>(
  ({ onSubmit, defaultValues, initialData }, ref) => {
    const [fileId, setFileId] = useState<string>(initialData?.fileId!);
    const [openAccordion, setOpenAccordion] = useState<string | undefined>("name");
    const { setIsFileUploading, setIsFileProcessing } = useQrBuilderContext();

    const { getDefaultValues, encodeFormData } = useQRFormData({
      qrType: EQRType.VIDEO,
      initialData,
    });

    const formDefaults = getDefaultValues({
      qrName: "",
      filesVideo: [],
      ...defaultValues,
    });

    const form = useForm<TVideoQRFormData>({
      resolver: zodResolver(videoQRSchema),
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
        <form className="w-full">
          <Accordion
            type="single"
            collapsible
            value={openAccordion}
            onValueChange={(value) => setOpenAccordion(value as string | undefined)}
            className="w-full space-y-2"
          >
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
                  placeholder={QR_NAME_PLACEHOLDERS.VIDEO}
                  tooltip="Only you can see this. It helps you recognize your QR codes later."
                  initFromPlaceholder
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="details"
              className="border-none rounded-[20px] px-4 bg-[#fbfbfb]"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-start gap-3 text-left">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <VideoIcon className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground text-base font-medium">
                      Video
                    </span>
                    <span className="text-muted-foreground text-sm font-normal">
                      Upload your video file
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              {openAccordion === "details" && <Separator className="mb-3" />}
              <AccordionContent className="pt-2 ">
                <FileUploadField
                  title="Video"
                  name="filesVideo"
                  label={QR_FILE_TITLES.VIDEO}
                  accept="video/*"
                  maxSize={50 * 1024 * 1024}
                  onFileIdReceived={setFileId}
                  onUploadStateChange={setIsFileUploading}
                  onProcessingStateChange={setIsFileProcessing}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </FormProvider>
    );
  },
);
