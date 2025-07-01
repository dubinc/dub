import { LinkProps, QRProps, UserProps } from "@/lib/types";
import { NewQrProps, UpdateQrProps } from "@/lib/types.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { Options } from "qr-code-styling";

export type QRBuilderData = {
  title: string;
  styles: Options;
  frameOptions: {
    id: string;
  };
  qrType: EQRType;
  files: File[];
};

export type QrStorageData = QRProps & {
  user: UserProps;
  link: LinkProps;
};

export type QRPartialUpdateData = {
  title?: string;
  data?: string;
  files?: File[];
};

export const convertQRBuilderDataToServer = async (
  qrBuilderData: QRBuilderData,
  options: {
    domain: string;
    fileToBase64?: (file: File) => Promise<string>;
  },
): Promise<NewQrProps> => {
  const { domain, fileToBase64 } = options;

  const data = qrBuilderData.styles.data || "";

  let file: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (qrBuilderData.files && qrBuilderData.files.length > 0) {
    const firstFile = qrBuilderData.files[0];
    fileName = firstFile.name;
    fileSize = firstFile.size;

    if (fileToBase64) {
      file = await fileToBase64(firstFile);
    }
  }

  return {
    data,
    qrType: qrBuilderData.qrType,
    title: qrBuilderData.title,
    styles: qrBuilderData.styles,
    frameOptions: qrBuilderData.frameOptions,
    file,
    fileName,
    fileSize,
    link: {
      url: data,
      domain,
      tagId: null,
      webhookIds: [],
    },
  };
};

export const convertQRBuilderDataToUpdate = async (
  qrBuilderData: QRBuilderData,
  options: {
    domain: string;
    fileToBase64?: (file: File) => Promise<string>;
  },
): Promise<UpdateQrProps> => {
  const { domain, fileToBase64 } = options;

  const data = qrBuilderData.styles.data || "";

  let file: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (qrBuilderData.files && qrBuilderData.files.length > 0) {
    const firstFile = qrBuilderData.files[0];
    fileName = firstFile.name;
    fileSize = firstFile.size;

    if (fileToBase64) {
      file = await fileToBase64(firstFile);
    }
  }

  return {
    data,
    qrType: qrBuilderData.qrType,
    title: qrBuilderData.title,
    styles: qrBuilderData.styles,
    frameOptions: qrBuilderData.frameOptions,
    file,
    fileName,
    fileSize,
    link: {
      url: data,
      domain,
      tagId: null,
      webhookIds: [],
    },
  };
};

export const convertQrStorageDataToBuilder = (
  qrStorageData: QrStorageData,
): QRBuilderData => {
  return {
    title: qrStorageData.title || "",
    styles: (qrStorageData.styles as Options) || {},
    frameOptions: (qrStorageData.frameOptions as { id: string }) || {
      id: "none",
    },
    qrType: qrStorageData.qrType as EQRType,
    files: [], // Files are not transferred when updating via rename
  };
};

export const convertQrStorageDataToBuilderWithPartialUpdate = (
  qrStorageData: QrStorageData,
  partialUpdate: QRPartialUpdateData,
): QRBuilderData => {
  const currentData = (qrStorageData.styles as Options)?.data ?? "";
  const updatedStyles = {
    ...(qrStorageData.styles as Options),
    data: partialUpdate.data ?? currentData,
  };

  return {
    title: partialUpdate.title ?? qrStorageData.title ?? "",
    styles: updatedStyles,
    frameOptions: (qrStorageData.frameOptions as { id: string }) || {
      id: "none",
    },
    qrType: qrStorageData.qrType as EQRType,
    files: partialUpdate.files || [],
  };
};
