import { LinkProps, QRProps, UserProps } from "@/lib/types";
import { File } from "@dub/prisma/client";

/**
 * QR code data from database with all relations included
 */
export type TQrStorageData = QRProps & {
  user: UserProps;
  link: LinkProps;
  file?: File;
  logoOptions?: {
    type: "suggested" | "uploaded";
    id?: string;
    fileId?: string;
  } | null;
};
