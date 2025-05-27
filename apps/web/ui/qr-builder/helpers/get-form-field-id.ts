import { TQRInputType } from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";

export const getFormFieldId = (
  id: string,
  type: TQRInputType,
  label: string,
) => (type === "file" ? `${id}${label}` : id);
