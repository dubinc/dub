"use client";

import { CountrySelectAutocompleteComponent } from "@/ui/qr-builder/components/country-select-autocomplete";
import { PhoneNumberInputComponent } from "@/ui/qr-builder/components/phone-number-input";
import { Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Controller, useFormContext } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import { Country } from "react-phone-number-input/input";

interface FormInputProps {
  name: string;
  type: "text" | "url" | "tel" | "password" | "textarea";
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  initFromPlaceholder?: boolean;
  error?: string;
  defaultCountry: Country;
}

export const FormInput = ({
  name,
  type,
  placeholder,
  maxLength,
  required = true,
  initFromPlaceholder = false,
  error,
  defaultCountry,
}: FormInputProps) => {
  const { control, register, setValue, trigger } = useFormContext();

  const autoCompleteValue = getAutoCompleteValue(type);

  // Function to handle adding https:// prefix for URL inputs
  const handleUrlBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = e.target.value.trim();
    if (
      currentValue &&
      !currentValue.startsWith("http://") &&
      !currentValue.startsWith("https://")
    ) {
      const newValue = `https://${currentValue}`;
      setValue(name, newValue, { shouldDirty: true });
      // Wait for trigger to complete to ensure formState updates
      await trigger(name);
    }
  };

  if (type === "textarea") {
    return (
      <textarea
        className={cn(
          "border-border-500 focus:border-secondary h-36 w-full rounded-md border p-3 text-base",
          {
            "border-red-500": error,
          },
        )}
        placeholder={placeholder}
        maxLength={maxLength || 500}
        required={required}
        {...register(name)}
      />
    );
  }

  if (type === "tel") {
    return (
      <Controller
        name={name}
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
  }

  if (initFromPlaceholder) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type={type}
            className={cn(
              "border-border-500 focus:border-secondary h-11 w-full max-w-full rounded-md border p-3 text-base",
              {
                "border-red-500": error,
              },
            )}
            autoComplete={autoCompleteValue}
            placeholder={placeholder}
            maxLength={maxLength}
            required={required}
            onFocus={(e) => {
              if (!e.target.value && placeholder) {
                field.onChange(placeholder);
              }
            }}
          />
        )}
      />
    );
  }

  return (
    <Input
      type={type}
      className={cn(
        "border-border-500 focus:border-secondary h-11 w-full max-w-full rounded-md border p-3 text-base",
        {
          "border-red-500": error,
        },
      )}
      autoComplete={autoCompleteValue}
      placeholder={placeholder}
      maxLength={maxLength}
      required={required}
      {...register(name)}
      {...(type === "url" && { onBlur: handleUrlBlur })}
    />
  );
};

function getAutoCompleteValue(type: string): "on" | "tel" | "url" {
  switch (type) {
    case "tel":
      return "tel";
    case "url":
      return "url";
    default:
      return "on";
  }
}
