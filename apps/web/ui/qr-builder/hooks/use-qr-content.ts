import { ERROR_MESSAGES } from "@/ui/qr-builder/constants/errors.ts";
import { ChangeEvent, useState } from "react";
import { ISelectOption } from "../components/select";
import { EQRType, FILE_QR_TYPES } from "../constants/get-qr-config";
import {
  QR_NAME_INPUT,
  QR_TYPE_INPUTS_CONFIG,
} from "../constants/qr-type-inputs-config";

interface UseQRContentParams {
  qrType: EQRType;
  minimalFlow?: boolean;
  initialInputValues?: Record<string, string>;
  initialFiles?: File[];
  initialIsHiddenNetwork?: boolean;
  initialInputErrors?: Record<string, string>;
  handleContent: (content: {
    inputValues: Record<string, string>;
    files: File[];
    isHiddenNetwork: boolean;
    qrType: EQRType;
  }) => void;
}

export function useQRContent({
  qrType,
  minimalFlow = false,
  initialInputValues = {},
  initialFiles = [],
  initialIsHiddenNetwork = false,
  initialInputErrors = {},
  handleContent,
}: UseQRContentParams) {
  const [inputValues, setInputValues] =
    useState<Record<string, string>>(initialInputValues);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [isHiddenNetwork, setIsHiddenNetwork] = useState(
    initialIsHiddenNetwork,
  );
  const [inputErrors, setInputErrors] =
    useState<Record<string, string>>(initialInputErrors);
  const [fileError, setFileError] = useState<string>("");

  const validateField = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
    setInputErrors((prev) => ({
      ...prev,
      [id]: value.trim() === "" ? ERROR_MESSAGES.input.emptyField : "",
    }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const updatedValues = { ...inputValues, [id]: value };
    const updatedErrors = {
      ...inputErrors,
      [id]: value.trim() === "" ? ERROR_MESSAGES.input.emptyField : "",
    };
    setInputValues(updatedValues);
    setInputErrors(updatedErrors);

    if (minimalFlow) {
      handleContent({
        inputValues: updatedValues,
        files,
        isHiddenNetwork,
        qrType,
      });
    }
  };

  const handleEncryptionSelectChange = (option: ISelectOption) => {
    const updatedValues = {
      ...inputValues,
      networkEncryption: option.id === "none" ? "" : option.id,
    };
    setInputValues(updatedValues);

    if (minimalFlow) {
      handleContent({
        inputValues: updatedValues,
        files,
        isHiddenNetwork,
        qrType,
      });
    }
  };

  const handleSetIsHiddenNetwork = (isChecked: boolean) => {
    setIsHiddenNetwork(isChecked);

    if (minimalFlow) {
      handleContent({ inputValues, files, isHiddenNetwork: isChecked, qrType });
    }
  };

  const renderedInputs = (): string[] => {
    const fields = QR_TYPE_INPUTS_CONFIG[qrType] || [];
    return fields.map((field) => field.id);
  };

  const handleValidationAndContentSubmit = () => {
    let isValid: boolean;

    if (FILE_QR_TYPES.includes(qrType)) {
      const qrNameInputId = QR_NAME_INPUT.id;
      const qrNameInputValue = inputValues[qrNameInputId]?.trim() || "";

      validateField(qrNameInputId, qrNameInputValue);

      const hasValidName = qrNameInputValue !== "";
      const hasFiles = files.length > 0;
      const hasBlockingErrors =
        fileError && fileError !== ERROR_MESSAGES.file.maxFilesExceeded;

      if (!hasFiles) setFileError(ERROR_MESSAGES.file.noFileUploaded);

      const isValid = hasValidName && hasFiles && !hasBlockingErrors;

      if (isValid) {
        setFileError("");
        handleContent({ inputValues, files, isHiddenNetwork, qrType });
      }

      return isValid;
    } else {
      renderedInputs().forEach((id) =>
        validateField(id, inputValues[id] || ""),
      );
      isValid = renderedInputs().every((id) => inputValues[id]?.trim());
    }

    if (isValid) {
      handleContent({ inputValues, files, isHiddenNetwork, qrType });
    }

    return isValid;
  };

  return {
    inputValues,
    setInputValues,
    files,
    setFiles,
    isHiddenNetwork,
    setIsHiddenNetwork,
    inputErrors,
    setInputErrors,
    fileError,
    setFileError,
    validateField,
    handleChange,
    handleEncryptionSelectChange,
    handleSetIsHiddenNetwork,
    renderedInputs,
    handleValidationAndContentSubmit,
  };
}
