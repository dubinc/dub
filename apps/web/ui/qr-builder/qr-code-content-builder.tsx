import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import {
  QR_NAME_INPUT,
  QR_TYPE_INPUTS_CONFIG,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex, Text } from "@radix-ui/themes";
import { Info } from "lucide-react";
import { ChangeEvent, FC, useEffect, useState } from "react";
import { ButtonsWrapper } from "./components/buttons-wrapper.tsx";
import { CheckboxWithLabel } from "./components/checkbox-with-label.tsx";
import { FileCardContent } from "./components/file-card-content.tsx";
import { InputWithLabel } from "./components/input-with-label.tsx";
import { ISelectOption, Select } from "./components/select.tsx";
import {
  EQRType,
  FILE_QR_TYPES,
  LINKED_QR_TYPES,
} from "./constants/get-qr-config.ts";
import { WIFI_ENCRYPTION_TYPES } from "./constants/wifi-encryption-types.ts";

interface IQRContentBuilderProps {
  qrType: EQRType;
  handleContent: (content: {
    inputValues: Record<string, string>;
    files: File[];
    isHiddenNetwork: boolean;
    qrType: EQRType;
  }) => void;
  minimalFlow?: boolean;
  initialInputValues?: Record<string, string>;
}

export const QRCodeContentBuilder: FC<IQRContentBuilderProps> = ({
  qrType,
  handleContent,
  minimalFlow = false,
  initialInputValues = {},
}) => {
  const { isMobile } = useMediaQuery();

  const [files, setFiles] = useState<File[]>([]);
  const [showFileError, setShowFileError] = useState(false);
  const [isHiddenNetwork, setIsHiddenNetwork] = useState(
    initialInputValues.isHiddenNetwork === "true",
  );
  const [inputValues, setInputValues] =
    useState<Record<string, string>>(initialInputValues);
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setInputValues(initialInputValues);
    setIsHiddenNetwork(initialInputValues.isHiddenNetwork === "true");
  }, [initialInputValues]);

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

    const updatedValues = { ...inputValues, [id]: value };
    const updatedErrors = {
      ...inputErrors,
      [id]: value.trim() === "" ? "Field is required" : "",
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

  const handleNext = () => {
    let isValid: boolean;

    if (FILE_QR_TYPES.includes(qrType)) {
      setShowFileError(files.length === 0);
      isValid = files.length > 0;
    } else {
      renderedInputs().forEach((id) =>
        validateField(id, inputValues[id] || ""),
      );
      isValid = renderedInputs().every((id) => inputValues[id]?.trim());
    }

    if (isValid) {
      handleContent({ inputValues, files, isHiddenNetwork, qrType });
    }
  };

  const renderCardContent = () => {
    if (!qrType) return <p className="text-neutral text-sm">Unknown QR Type</p>;

    if (LINKED_QR_TYPES.includes(qrType) || qrType === EQRType.WHATSAPP) {
      return QR_TYPE_INPUTS_CONFIG[qrType].map((field, index) => (
        <InputWithLabel
          key={index}
          onChange={handleChange}
          value={inputValues[field.id] || ""}
          setValue={(value: string) => {
            setInputValues((prev) => ({ ...prev, [field.id]: value }));
          }}
          errorMessage={inputErrors[field.id]}
          minimalFlow={minimalFlow}
          initFromPlaceholder={field.initFromPlaceholder}
          tooltip={field.tooltip}
          {...field}
        />
      ));
    }

    if (qrType === EQRType.WIFI) {
      return (
        <>
          {QR_TYPE_INPUTS_CONFIG[qrType].map((field, index) => (
            <InputWithLabel
              key={index}
              onChange={handleChange}
              value={inputValues[field.id] || ""}
              setValue={(value: string) => {
                setInputValues((prev) => ({ ...prev, [field.id]: value }));
              }}
              errorMessage={inputErrors[field.id]}
              initFromPlaceholder={field.initFromPlaceholder}
              {...field}
            />
          ))}
          <Flex
            direction="column"
            gap="2"
            justify="start"
            className="w-full basis-1/2"
          >
            <Flex align="center" gap="1">
              <label className="text-neutral text-sm font-medium">
                Network Security Type
              </label>
              <TooltipComponent
                tooltip={
                  "Most routers today use WPA/WPA2. If you’re not sure, choose this. You can also check on your router label."
                }
              />
            </Flex>
            <Select
              options={WIFI_ENCRYPTION_TYPES}
              onChange={handleEncryptionSelectChange}
            />
            <CheckboxWithLabel
              label="Wi-Fi is not visible to others"
              checked={isHiddenNetwork}
              onCheckedChange={handleSetIsHiddenNetwork}
            />
            <Flex
              align="center"
              gap="2"
              className="border-border-300 bg-border-400 h-11 w-full rounded-md border p-3"
            >
              <Info className="size-7 text-neutral-500" />
              <Text as="p" size="1" className="text-neutral-800">
                Not sure where to find this info? Look at the label on your
                router — it usually lists your Wi-Fi name, password, and
                security type.
              </Text>
            </Flex>
          </Flex>
        </>
      );
    }

    if (FILE_QR_TYPES.includes(qrType)) {
      return (
        <>
          <InputWithLabel
            key={"fileQRTypeName"}
            onChange={handleChange}
            value={inputValues[QR_NAME_INPUT.id] || ""}
            setValue={(value: string) => {
              setInputValues((prev) => ({
                ...prev,
                [QR_NAME_INPUT.id]: value,
              }));
            }}
            errorMessage={inputErrors[QR_NAME_INPUT.id]}
            {...QR_NAME_INPUT}
          />
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
    <div className="flex h-full w-full flex-col items-center justify-between gap-4 md:items-start">
      <div
        className={cn(
          "flex h-fit w-full flex-col items-center justify-center gap-6 p-0 md:max-w-[654px] md:p-0",
          {
            "border-border-100 rounded-lg border p-3 md:px-6 md:py-4":
              !minimalFlow,
          },
        )}
      >
        <div className="flex w-full flex-col gap-4">{renderCardContent()}</div>

        {!minimalFlow && !isMobile && (
          <ButtonsWrapper
            qrType={qrType}
            files={files}
            handleNext={handleNext}
            disabled={validationFailed}
          />
        )}
      </div>
      {!minimalFlow && isMobile && (
        <ButtonsWrapper
          qrType={qrType}
          files={files}
          handleNext={handleNext}
          disabled={validationFailed}
        />
      )}
    </div>
  );
};
