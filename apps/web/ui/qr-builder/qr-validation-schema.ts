import { ERROR_MESSAGES } from "@/ui/qr-builder/constants/errors.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import {
  QR_TYPE_INPUTS_CONFIG,
  TQRInputType,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { isValidPhoneNumber } from "react-phone-number-input";
import * as Yup from "yup";

const FIELD_VALIDATION_RULES: Record<string, Yup.AnySchema> = {
  websiteLink: Yup.string()
    .trim()
    .min(1, ERROR_MESSAGES.input.emptyField)
    .url(ERROR_MESSAGES.input.invalidURL)
    .required(ERROR_MESSAGES.input.emptyField),
  message: Yup.string()
    .trim()
    .min(1, ERROR_MESSAGES.input.emptyField)
    .max(500, "Too long")
    .required(ERROR_MESSAGES.input.emptyField),
  number: Yup.string()
    .trim()
    .required(ERROR_MESSAGES.input.emptyField)
    .test({
      message: "Invalid phone number",
      test(value) {
        try {
          return isValidPhoneNumber(value);
        } catch {
          return false;
        }
      },
    }),
  file: Yup.mixed<File[]>().test(
    "file-required",
    ERROR_MESSAGES.file.noFileUploaded,
    (value: File[]) => value && value.length > 0,
  ),
};

const getFieldValidation = (id: string, type?: TQRInputType): Yup.AnySchema => {
  if (type === "file") {
    return (
      FIELD_VALIDATION_RULES[id] ||
      Yup.mixed().test(
        "file-required",
        ERROR_MESSAGES.file.noFileUploaded,
        (value: File[]) => value && value.length > 0,
      )
    );
  }

  return (
    FIELD_VALIDATION_RULES[id] ||
    Yup.string()
      .trim()
      .min(1, ERROR_MESSAGES.input.emptyField)
      .required(ERROR_MESSAGES.input.emptyField)
  );
};

export function getQRValidationSchema(qrType: EQRType) {
  const inputConfigs = QR_TYPE_INPUTS_CONFIG[qrType];
  const shape: Record<string, Yup.AnySchema> = {};

  inputConfigs?.forEach((input) => {
    shape[input.id] = getFieldValidation(input.id, input.type);
  });

  return Yup.object().shape(shape);
}
