"use client";

import { forwardRef } from "react";
import { EQRType } from "../constants/get-qr-config";
import { TQRFormData } from "../types/context";
import {
  ImageForm,
  PdfForm,
  VideoForm,
  WebsiteForm,
  WhatsAppForm,
  WifiForm,
} from "./components";
import { QRFormRef } from "./types";

interface QRFormResolverProps {
  qrType: EQRType;
  onSubmit: (data: TQRFormData) => void;
  defaultValues?: Partial<TQRFormData>;
  initialData?: {
    qrType: EQRType;
    data: string;
    link?: { url: string; title?: string };
    fileId?: string;
  };
}

export const QrFormResolver = forwardRef<QRFormRef, QRFormResolverProps>(
  ({ qrType, onSubmit, defaultValues, initialData }, ref) => {
    const formComponents = {
      [EQRType.WEBSITE]: (
        <WebsiteForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.WHATSAPP]: (
        <WhatsAppForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.WIFI]: (
        <WifiForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.PDF]: (
        <PdfForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.IMAGE]: (
        <ImageForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.VIDEO]: (
        <VideoForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.SOCIAL]: (
        <WebsiteForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.APP_LINK]: (
        <WebsiteForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
      [EQRType.FEEDBACK]: (
        <WebsiteForm
          ref={ref as any}
          onSubmit={onSubmit as any}
          defaultValues={defaultValues as any}
          initialData={initialData}
        />
      ),
    };

    const selectedForm = formComponents[qrType] || (
      <div className="p-4 text-center text-gray-500">
        <p>Form not available for this QR type: {qrType}</p>
      </div>
    );

    return <div className="w-full">{selectedForm}</div>;
  },
);
