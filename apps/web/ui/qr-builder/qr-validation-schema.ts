import { ERROR_MESSAGES } from "@/ui/qr-builder/constants/errors.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import {
  QR_TYPE_INPUTS_CONFIG,
  TQRInputType,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

const FIELD_VALIDATION_RULES: Record<string, z.ZodTypeAny> = {
  websiteLink: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.input.emptyField)
    .url(ERROR_MESSAGES.input.invalidURL),
  message: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.input.emptyField)
    .max(500, "Message is too long"),
  number: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.input.emptyField)
    .refine(
      (val) => {
        try {
          return isValidPhoneNumber(val);
        } catch {
          return false;
        }
      },
      { message: "Invalid phone number" },
    ),
  file: z.preprocess(
    (val) => (val === undefined ? [] : val),
    z
      .array(z.instanceof(File))
      .refine((files) => files.length > 0, {
        message: ERROR_MESSAGES.file.noFileUploaded,
      }),
  ),
};

const getFieldValidation = (id: string, type?: TQRInputType): z.ZodTypeAny => {
  if (type === "file") {
    return (
      FIELD_VALIDATION_RULES[id] ||
      z.array(z.instanceof(File)).nonempty(ERROR_MESSAGES.file.noFileUploaded)
    );
  }

  return (
    FIELD_VALIDATION_RULES[id] ||
    z.string().trim().min(1, ERROR_MESSAGES.input.emptyField)
  );
};

export function getQRValidationSchema(qrType: EQRType) {
  const inputConfigs = QR_TYPE_INPUTS_CONFIG[qrType];
  const shape: Record<string, z.ZodTypeAny> = {};

  inputConfigs?.forEach((input) => {
    shape[input.id] = getFieldValidation(input.id, input.type);
  });

  return z.object(shape);
}
