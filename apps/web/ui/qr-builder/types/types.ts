import { LinkProps, QRProps, UpdateQrProps, UserProps } from "@/lib/types.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { File } from "@dub/prisma/client";
import { Options } from "qr-code-styling";

export type FrameOptions = {
  id: string;
  color: string;
  textColor: string;
  text: string;
};

export type QRBuilderData = {
  title: string;
  styles: Options;
  frameOptions: FrameOptions;
  qrType: EQRType;
  fileId?: string;
};

export type FileProps = File;

export type QrStorageData = QRProps & {
  user: UserProps;
  link: LinkProps;
  file?: FileProps;
};

export type QRPartialUpdateData = {
  title?: string;
  data?: string;
  fileId?: string;
};

export type QRUpdateResult = {
  hasChanges: boolean;
  changes: {
    title: boolean;
    data: boolean;
    qrType: boolean;
    frameOptions: boolean;
    styles: boolean;
    files: boolean;
  };
  updateData: UpdateQrProps;
};
