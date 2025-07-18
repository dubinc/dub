"use server";

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { getFiles } from "@/ui/qr-builder/helpers/file-store.ts";
import { FrameOptions, QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { cookies } from "next/headers";
import { Options } from "qr-code-styling";
import { ECookieArg } from "../../../core/interfaces/cookie.interface.ts";

export type ProcessQrDataOptions = {
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onError?: (error: string) => void;
};

export type TProcessedQRData = {
  title: string;
  styles: Options;
  frameOptions: FrameOptions;
  qrType: EQRType;
  fileId?: string;
};

export const prepareRegistrationQrData = async (
  qrDataToCreate: QRBuilderData | null,
  options: ProcessQrDataOptions = {},
): Promise<TProcessedQRData | null> => {
  const { onUploadStart, onUploadEnd, onError } = options;

  const cookieStore = cookies();

  if (!qrDataToCreate) return null;

  const files = getFiles();
  if (!files || files.length === 0) {
    cookieStore.set(
      ECookieArg.PROCESSED_QR_DATA,
      JSON.stringify({ ...qrDataToCreate }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    );

    return { ...qrDataToCreate };
  }

  try {
    onUploadStart?.();
    const firstFile = files[0];

    const formData = new FormData();
    formData.append("file", firstFile);

    console.log("files handler url", process.env.NEXT_PUBLIC_FILES_HANDLER_URL);

    const response = await fetch(process.env.NEXT_PUBLIC_FILES_HANDLER_URL!, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Failed to upload file", response);
      throw new Error("Failed to upload file");
    }

    const respData = await response.json();
    const {
      file: { id: fileId },
    } = respData;

    console.log("response from files handler", response);

    cookieStore.set(
      ECookieArg.PROCESSED_QR_DATA,
      JSON.stringify({ ...qrDataToCreate, fileId }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    );

    return {
      ...qrDataToCreate,
      fileId,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = "Failed to upload file. Please try again.";
    onError?.(errorMessage);

    cookieStore.set(
      ECookieArg.PROCESSED_QR_DATA,
      JSON.stringify({ ...qrDataToCreate }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    );

    return { ...qrDataToCreate };
  } finally {
    onUploadEnd?.();
  }
};
