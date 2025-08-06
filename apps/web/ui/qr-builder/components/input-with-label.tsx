import { FileCardContent } from "@/ui/qr-builder/components/file-card-content";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import {
  EAcceptedFileType,
  TQRInputType,
} from "@/ui/qr-builder/constants/qr-type-inputs-config.ts";
import { Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";
import {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Country } from "react-phone-number-input/input";
import "react-phone-number-input/style.css";

const PhoneInputSkeleton = () => (
  <div className="bg-border-500 h-11 w-full animate-pulse rounded-md" />
);

const LazyPhoneInputWrapper = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PhoneInputSkeleton />;
  }

  return <>{children}</>;
};

const PhoneInput = dynamic(() => import("react-phone-number-input"), {
  loading: () => <PhoneInputSkeleton />,
  ssr: false,
});

const LazyCountrySelectAutocompleteComponent = dynamic(
  () =>
    import("./country-select-autocomplete").then((mod) => ({
      default: mod.CountrySelectAutocompleteComponent,
    })),
  { ssr: false },
);

const LazyPhoneNumberInputComponent = dynamic(
  () =>
    import("./phone-number-input").then((mod) => ({
      default: mod.PhoneNumberInputComponent,
    })),
  { ssr: false },
);

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
        <LazyPhoneInputWrapper>
          <Controller
            name={id}
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                international
                defaultCountry={defaultCountry}
                countrySelectComponent={LazyCountrySelectAutocompleteComponent}
                inputComponent={LazyPhoneNumberInputComponent}
                className={cn("w-full [&>div]:w-full", {
                  "[&_input]:!border-red-500": !!error,
                })}
              />
            )}
          />
        </LazyPhoneInputWrapper>
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
