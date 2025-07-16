import { NewQrProps, UpdateQrProps } from "@/lib/types.ts";
import {
  BLACK_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import { FRAME_TEXT } from "@/ui/qr-builder/constants/customization/frames.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import {
  FrameOptions,
  QRBuilderData,
  QRPartialUpdateData,
  QrStorageData,
  QRUpdateResult,
} from "@/ui/qr-builder/types/types.ts";
import { Options } from "qr-code-styling";

export const convertQRBuilderDataToServer = async (
  qrBuilderData: QRBuilderData,
  options: {
    domain: string;
  },
): Promise<NewQrProps> => {
  const { domain } = options;

  const data = qrBuilderData.styles.data || "";

  let fileId: string | undefined;

  if (qrBuilderData.files && qrBuilderData.files.length > 0) {
    const firstFile = qrBuilderData.files[0];

    const formData = new FormData();
    formData.append("file", firstFile);

    const response = await fetch(process.env.NEXT_PUBLIC_FILES_HANDLER_URL!, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const respData = await response.json();

    fileId = respData.file.id;
  }

  return {
    data,
    qrType: qrBuilderData.qrType,
    title: qrBuilderData.title,
    styles: qrBuilderData.styles,
    frameOptions: qrBuilderData.frameOptions,
    fileId,
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
    frameOptions: (qrStorageData.frameOptions as FrameOptions) || {
      id: "none",
      color: BLACK_COLOR,
      textColor: WHITE_COLOR,
      text: FRAME_TEXT,
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
    frameOptions: (qrStorageData.frameOptions as FrameOptions) || {
      id: "none",
      color: BLACK_COLOR,
      textColor: WHITE_COLOR,
      text: FRAME_TEXT,
    },
    qrType: qrStorageData.qrType as EQRType,
    files: partialUpdate.files || [],
  };
};

export const convertQRForUpdate = async (
  originalQR: QrStorageData,
  newQRData: QRBuilderData,
  options: {
    domain: string;
  },
): Promise<QRUpdateResult> => {
  const { domain } = options;

  const titleChanged = newQRData.title !== originalQR.title;
  const qrTypeChanged = newQRData.qrType !== originalQR.qrType;
  const frameOptionsChanged = (() => {
    const originalFrame = originalQR.frameOptions as FrameOptions;
    const newFrame = newQRData.frameOptions;
    
    const fieldsToCheck = ['id', 'color', 'text', 'textColor'] as const;
    
    return fieldsToCheck.some(field => 
      newFrame[field] !== originalFrame?.[field]
    );
  })();

  const originalData = (originalQR.styles as Options)?.data || "";
  const newData = newQRData.styles.data || "";
  const dataChanged = newData !== originalData;

  const hasNewFiles = newQRData.files && newQRData.files.length > 0;
  const hasExistingFiles = originalQR.fileId;

  const hasChanges =
    titleChanged ||
    dataChanged ||
    qrTypeChanged ||
    frameOptionsChanged ||
    hasNewFiles;

  let fileId: string | undefined;

  if (hasNewFiles) {
    const firstFile = newQRData.files[0];

    const formData = new FormData();
    formData.append("file", firstFile);

    const response = await fetch(process.env.NEXT_PUBLIC_FILES_HANDLER_URL!, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const respData = await response.json();

    fileId = respData.file.id;
  }

  const linkUrl = hasNewFiles || hasExistingFiles ? "" : newData;

  const updateData: UpdateQrProps = {
    data: newData,
    qrType: newQRData.qrType,
    title: newQRData.title,
    styles: newQRData.styles,
    frameOptions: newQRData.frameOptions,
    fileId,
    link: {
      url: linkUrl,
      domain,
      tagId: null,
      webhookIds: [],
    },
  };

  return {
    hasChanges,
    changes: {
      title: titleChanged,
      data: dataChanged,
      qrType: qrTypeChanged,
      frameOptions: frameOptionsChanged,
      files: hasNewFiles,
    },
    updateData,
  };
};
