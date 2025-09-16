"use client";

import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@dub/utils";
import { Input } from "@dub/ui";
import { Flex } from "@radix-ui/themes";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip";
import { CountrySelectAutocompleteComponent } from "@/ui/qr-builder/components/country-select-autocomplete";
import { PhoneNumberInputComponent } from "@/ui/qr-builder/components/phone-number-input";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { Country } from "react-phone-number-input/input";

interface BaseFormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "tel" | "password" | "textarea";
  tooltip?: string;
  maxLength?: number;
  className?: string;
  required?: boolean;
  initFromPlaceholder?: boolean;
}

export const BaseFormField = ({
  name,
  label,
  placeholder,
  type = "text",
  tooltip = "",
  maxLength,
  className,
  required = true,
  initFromPlaceholder = false,
}: BaseFormFieldProps) => {
  const { control, register, formState: { errors } } = useFormContext();
  const [defaultCountry, setDefaultCountry] = useState<Country>("US");
  
  const error = errors[name]?.message as string;

  useEffect(() => {
    const cookieCountry = Cookies.get("country");
    if (cookieCountry && cookieCountry.length === 2) {
      setDefaultCountry(cookieCountry as Country);
    }
  }, []);

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

  let inputField;

  if (type === "textarea") {
    inputField = (
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
  } else if (type === "tel") {
    inputField = (
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
  } else {
    if (initFromPlaceholder) {
      inputField = (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type={type}
              className={cn(
                "border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base",
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
    } else {
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
          maxLength={maxLength}
          required={required}
          {...register(name)}
        />
      );
    }
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
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