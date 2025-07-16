import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { getFiles } from "@/ui/qr-builder/helpers/file-store.ts";
import { FrameOptions, QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { Options } from "qr-code-styling";

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
  file?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

export const prepareRegistrationQrData = async (
  qrDataToCreate: QRBuilderData | null,
  options: ProcessQrDataOptions = {},
): Promise<TProcessedQRData | null> => {
  const { onUploadStart, onUploadEnd, onError } = options;

  if (!qrDataToCreate) return null;

  const files = getFiles();
  if (!files || files.length === 0) {
    return { ...qrDataToCreate, file: null };
  }

  try {
    onUploadStart?.();
    const firstFile = files[0];

    const formData = new FormData();
    formData.append("file", firstFile);

    console.log('files handler url', process.env.NEXT_PUBLIC_FILES_HANDLER_URL);

    const response = await fetch(process.env.NEXT_PUBLIC_FILES_HANDLER_URL!, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Failed to upload file", response);
      throw new Error("Failed to upload file");
    }

    const respData = await response.json();
    const { file: { id: fileId } } = respData;

    console.log("response from files handler", response);
    return {
      ...qrDataToCreate,
      file: fileId || null,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = "Failed to upload file. Please try again.";
    onError?.(errorMessage);

    return { ...qrDataToCreate, file: null };
  } finally {
    onUploadEnd?.();
  }
};
