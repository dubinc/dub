"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import Cookies from "js-cookie";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Country } from "react-phone-number-input/input";
import "react-phone-number-input/style.css";
import { FormInput } from "./form-input";

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
  const {
    formState: { errors },
  } = useFormContext();
  const [defaultCountry, setDefaultCountry] = useState<Country>("US");

  const error = errors[name]?.message as string;

  useEffect(() => {
    const cookieCountry = Cookies.get("country");
    if (cookieCountry && cookieCountry.length === 2) {
      setDefaultCountry(cookieCountry as Country);
    }
  }, []);

  const { control, register, setValue, trigger } = useFormContext();

  const isUrlField =
    type === "url" ||
    name.toLowerCase().includes("link") ||
    name.toLowerCase().includes("url");

  const handleUrlBlur = async (
    e: React.FocusEvent<HTMLInputElement>,
    onChange: (value: string) => void,
  ) => {
    const currentValue = e.target.value.trim();
    if (
      currentValue &&
      !currentValue.startsWith("http://") &&
      !currentValue.startsWith("https://")
    ) {
      const newValue = `https://${currentValue}`;
      onChange(newValue);
      setValue(name, newValue, { shouldDirty: true, shouldValidate: true });
      await trigger(name);
    }
  };

  // For tel type, use the original FormInput as it has special handling
  if (type === "tel") {
    return (
      <div className={cn("flex w-full flex-col gap-2 p-3", className)}>
        <label className="text-neutral text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <FormInput
          name={name}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          initFromPlaceholder={initFromPlaceholder}
          error={error}
          defaultCountry={defaultCountry}
        />
        {error && (
          <span className="text-xs font-medium text-red-500 md:text-sm">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col gap-2 p-3", className)}>
      <label className="text-neutral text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <InputGroup
        className={cn(
          "has-[[data-slot=input-group-control]:focus-visible]:!border-secondary has-[[data-slot=input-group-control]:focus-visible]:ring-0",
          {
            "border-red-500": error,
          },
        )}
      >
        {type === "textarea" ? (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <InputGroupTextarea
                {...field}
                placeholder={placeholder}
                maxLength={maxLength || 500}
                required={required}
                aria-invalid={!!error}
                className={cn("min-h-36", {
                  "border-red-500": error,
                })}
              />
            )}
          />
        ) : (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <InputGroupInput
                {...field}
                type={type}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                aria-invalid={!!error}
                autoComplete={isUrlField ? "url" : "on"}
                className={cn({
                  "border-red-500": error,
                })}
                onFocus={(e) => {
                  if (initFromPlaceholder && !e.target.value && placeholder) {
                    field.onChange(placeholder);
                  }
                }}
                onBlur={(e) => {
                  field.onBlur();
                  if (isUrlField) {
                    handleUrlBlur(e, field.onChange);
                  }
                }}
              />
            )}
          />
        )}
        {tooltip && (
          <InputGroupAddon align="inline-end">
            <Tooltip content={tooltip} delayDuration={150}>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <Info className="size-3.5" />
              </button>
            </Tooltip>
          </InputGroupAddon>
        )}
      </InputGroup>
      {error && (
        <span className="text-xs font-medium text-red-500 md:text-sm">
          {error}
        </span>
      )}
    </div>
  );
};
