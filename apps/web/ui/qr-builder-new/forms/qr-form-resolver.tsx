"use client";

import { forwardRef } from "react";
import { EQRType } from "../constants/get-qr-config";
import {
  WebsiteForm,
  WhatsAppForm,
  WifiForm,
  PdfForm,
  ImageForm,
  VideoForm,
} from "./components";
import { QRFormRef } from "./types";
import { QRFormData } from "../types/context";

interface QRFormResolverProps {
  qrType: EQRType;
  onSubmit: (data: QRFormData) => void;
  defaultValues?: Partial<QRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const QrFormResolver = forwardRef<QRFormRef, QRFormResolverProps>(
  ({ qrType, onSubmit, defaultValues, initialData }, ref) => {
    const getFormComponent = () => {
      switch (qrType) {
        case EQRType.WEBSITE:
          return (
            <WebsiteForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        case EQRType.WHATSAPP:
          return (
            <WhatsAppForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        case EQRType.WIFI:
          return (
            <WifiForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        case EQRType.PDF:
          return (
            <PdfForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        case EQRType.IMAGE:
          return (
            <ImageForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        case EQRType.VIDEO:
          return (
            <VideoForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        // For QR types that use WebsiteForm (Social, App Link, Feedback)
        case EQRType.SOCIAL:
        case EQRType.APP_LINK:
        case EQRType.FEEDBACK:
          return (
            <WebsiteForm
              ref={ref as any}
              onSubmit={onSubmit as any}
              defaultValues={defaultValues as any}
              initialData={initialData}
            />
          );

        default:
          return (
            <div className="p-4 text-center text-gray-500">
              <p>Form not available for this QR type: {qrType}</p>
            </div>
          );
      }
    };

    return <div className="w-full">{getFormComponent()}</div>;
  }
);