"use client";

import { useMediaQuery } from "@dub/ui";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import {
  EQRType,
  FILE_QR_TYPES,
  LINKED_QR_TYPES,
} from "../../../../(public)/landing/constants/get-qr-config.ts";
import { STEPS } from "../constants.ts";
import { usePageContext } from "../page-context.tsx";
import { ButtonsWrapper } from "./components/buttons-wrapper.tsx";
import { CheckboxWithLabel } from "./components/checkbox-with-label.tsx";
import { FileCardContent } from "./components/file-card-content.tsx";
import { InputWithLabel } from "./components/input-with-label.tsx";
import { Select } from "./components/select.tsx";
import { ENCRYPTION_TYPES, QR_CONTENT_CONFIG } from "./constants.ts";

export default function NewQRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams() as { slug?: string };
  const qrType = searchParams.get("type") as EQRType;
  const { setTitle, setCurrentStep } = usePageContext();
  const { isMobile } = useMediaQuery();

  const [files, setFiles] = useState<File[]>([]);
  const [showFileError, setShowFileError] = useState<boolean>(false);
  const [isHiddenNetwork, setIsHiddenNetwork] = useState<boolean>(false);

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  const validationFailed = Object.values(inputErrors).some((err) => err !== "");

  const validateField = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));

    setInputErrors((prev) => ({
      ...prev,
      [id]: value.trim() === "" ? "Field is required" : "",
    }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    validateField(id, value);
  };

  useEffect(() => {
    setTitle("Complete content of the QR");
    setCurrentStep(STEPS.content.step);
  }, [setTitle, setCurrentStep]);

  const renderedInputs = (): string[] => {
    if (LINKED_QR_TYPES.includes(qrType) || qrType === EQRType.WHATSAPP) {
      return QR_CONTENT_CONFIG[qrType]?.map((field) => field.id) || [];
    }

    if (qrType === EQRType.WIFI) {
      return QR_CONTENT_CONFIG[EQRType.WIFI]?.map((field) => field.id) || [];
    }

    return [];
  };

  const handleNext = () => {
    let qrDataExists: boolean;

    if (FILE_QR_TYPES.includes(qrType)) {
      setShowFileError(files.length === 0);
      qrDataExists = files.length > 0;
    } else {
      renderedInputs().map((id) => validateField(id, inputValues[id] || ""));
      qrDataExists =
        Object.keys(inputErrors).length === renderedInputs().length;
    }

    if (qrDataExists && slug) {
      router.replace(
        `/${slug}/new-qr/customization?type=${qrType}&content=true`,
      );
    }
  };

  const renderCardContent = () => {
    if (!qrType) return <p className="text-neutral text-sm">Unknown QR Type</p>;

    if (LINKED_QR_TYPES.includes(qrType) || qrType === EQRType.WHATSAPP) {
      return QR_CONTENT_CONFIG[qrType]?.map((field, index) => (
        <InputWithLabel
          key={index}
          onChange={handleChange}
          value={inputValues[field.id] || ""}
          errorMessage={inputErrors[field.id]}
          {...field}
        />
      ));
    }

    if (qrType === EQRType.WIFI) {
      return (
        <>
          {QR_CONTENT_CONFIG[EQRType.WIFI].map((field, index) => (
            <InputWithLabel
              key={index}
              onChange={handleChange}
              value={inputValues[field.id] || ""}
              errorMessage={inputErrors[field.id]}
              {...field}
            />
          ))}
          <div className="flex flex-col items-end justify-center gap-4 md:flex-row">
            <div className="flex w-full basis-1/2 flex-col gap-2">
              <label className="text-neutral text-sm font-medium">
                Type of encryption
              </label>
              <Select options={ENCRYPTION_TYPES} />
            </div>
            <CheckboxWithLabel
              label="Hidden Network option"
              checked={isHiddenNetwork}
              onCheckedChange={setIsHiddenNetwork}
            />
          </div>
        </>
      );
    }

    if (FILE_QR_TYPES.includes(qrType)) {
      return (
        <>
          <FileCardContent
            qrType={qrType}
            files={files}
            setFiles={(files) => {
              setShowFileError(files.length === 0);
              return setFiles(files);
            }}
          />
          {showFileError && (
            <p className="error-message text-sm text-red-500">
              At least one file must be uploaded
            </p>
          )}
        </>
      );
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-between gap-4 md:items-start">
      <div className="border-border-100 md flex h-fit w-full flex-col items-center justify-center gap-6 rounded-lg border p-3 md:max-w-[654px] md:px-6 md:py-4">
        <div className="flex w-full flex-col gap-4">
          {renderCardContent()}

          {!isMobile && (
            <ButtonsWrapper
              qrType={qrType}
              files={files}
              handleNext={handleNext}
              disabled={validationFailed}
            />
          )}
        </div>
      </div>
      {isMobile && (
        <ButtonsWrapper
          qrType={qrType}
          files={files}
          handleNext={handleNext}
          disabled={validationFailed}
        />
      )}
    </div>
  );
}
