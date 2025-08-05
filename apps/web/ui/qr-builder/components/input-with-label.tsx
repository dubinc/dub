import { CountrySelectAutocompleteComponent } from "@/ui/qr-builder/components/country-select-autocomplete.tsx";
import { FileCardContent } from "@/ui/qr-builder/components/file-card-content";
import { PhoneNumberInputComponent } from "@/ui/qr-builder/components/phone-number-input.tsx";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import {
  EAcceptedFileType,
  TQRInputType,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import Cookies from "js-cookie";
import {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Controller, useFormContext } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import { Country } from "react-phone-number-input/input";
import "react-phone-number-input/style.css";

interface IInputWithLabelProps {
  id: string;
  label: string;
  type: TQRInputType;
  placeholder: string;
  value?: string;
  setValue?: (value: string) => void;
  errorMessage?: string;
  initFromPlaceholder?: boolean;
  tooltip?: string;
  acceptedFileType?: EAcceptedFileType;
  maxFileSize?: number;
  homePageDemo?: boolean;
  isEdit?: boolean;
  isFileUploading?: boolean;
  setIsFileUploading?: Dispatch<SetStateAction<boolean>>;
  isFileProcessing?: boolean;
  setIsFileProcessing?: Dispatch<SetStateAction<boolean>>;
}

export const InputWithLabel: FC<IInputWithLabelProps> = ({
  id,
  label,
  type,
  placeholder,
  value = "",
  setValue,
  errorMessage,
  initFromPlaceholder = false,
  tooltip = "",
  acceptedFileType,
  maxFileSize,
  homePageDemo = false,
  isEdit = false,
  isFileUploading,
  setIsFileUploading,
  isFileProcessing,
  setIsFileProcessing,
  ...props
}) => {
  const {
    register,
    setValue: setFormValue,
    control,
    trigger,
    formState: { errors },
  } = useFormContext();
  const [defaultCountry, setDefaultCountry] = useState<Country>("US");

  useEffect(() => {
    const cookieCountry = Cookies.get("country");
    if (cookieCountry && cookieCountry.length === 2) {
      setDefaultCountry(cookieCountry as Country);
    }
  }, []);

  const error = errors[id]?.message as string;

  if (type === "file" && acceptedFileType && maxFileSize) {
    return (
      <Controller
        key={id}
        name={id}
        control={control}
        render={({
          field: { onChange, value = [] },
          fieldState: { error },
        }) => (
          <FileCardContent
            title={label}
            files={value}
            setFiles={(files) => {
              if (!Array.isArray(files)) {
                onChange(files);
                trigger(id);
                return;
              }

              const filesWithProgressStatus = files.map((file) => {
                return Object.assign(file, {
                  uploadStatus: "success",
                  uploadProgress: 100,
                });
              });

              onChange(filesWithProgressStatus);
              trigger(id);
            }}
            acceptedFileType={acceptedFileType}
            maxFileSize={maxFileSize}
            fileError={error?.message || ""}
            homePageDemo={homePageDemo}
            onFileIdReceived={(fileId) => setFormValue("fileId", fileId)}
            isEdit={isEdit}
            isFileUploading={isFileUploading}
            setIsFileUploading={setIsFileUploading}
            isFileProcessing={isFileProcessing}
            setIsFileProcessing={setIsFileProcessing}
          />
        )}
      />
    );
  }

  let autoCompleteValue: "on" | "tel" | "url";
  switch (type) {
    case "tel":
      autoCompleteValue = "tel";
      break;
    case "url":
      autoCompleteValue = "url";
      break;
    default:
      autoCompleteValue = "on";
  }

  let inputField: ReactNode;

  switch (type) {
    case "textarea":
      inputField = (
        <textarea
          className={cn(
            "border-border-500 focus:border-secondary h-36 w-full rounded-md border p-3 text-base",
            {
              "border-red-500": error,
            },
          )}
          placeholder={placeholder}
          maxLength={500}
          required
          {...register(id)}
          {...props}
        />
      );
      break;

    case "tel":
      inputField = (
        <Controller
          name={id}
          control={control}
          render={({ field }) => (
            <PhoneInput
              {...field}
              international
              defaultCountry={defaultCountry}
              countrySelectComponent={CountrySelectAutocompleteComponent}
              inputComponent={PhoneNumberInputComponent}
              className={cn("w-full [&>div]:w-full", {
                "[&_input]:!border-red-500": !!error,
              })}
            />
          )}
        />
      );
      break;

    default:
      inputField = (
        <Input
          type={type}
          className={cn(
            "border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base",
            {
              "border-red-500": error,
            },
          )}
          autoComplete={autoCompleteValue}
          placeholder={placeholder}
          onFocus={(e) => {
            if (initFromPlaceholder && !e.target.value) {
              setFormValue(id, placeholder);
            }
          }}
          required
          {...register(id)}
          {...props}
        />
      );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Flex gap="1" align="center">
        <label className="text-neutral text-sm font-medium">{label}</label>
        <TooltipComponent tooltip={tooltip} />
      </Flex>
      {inputField}
      {error && (
        <span className="text-xs font-medium text-red-500 md:text-sm">
          {error}
        </span>
      )}
    </div>
  );
};
