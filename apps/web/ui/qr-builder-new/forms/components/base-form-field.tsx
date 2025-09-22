"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip";
import { FormInput } from "./form-input";
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
  const { formState: { errors } } = useFormContext();
  const [defaultCountry, setDefaultCountry] = useState<Country>("US");
  
  const error = errors[name]?.message as string;

  useEffect(() => {
    const cookieCountry = Cookies.get("country");
    if (cookieCountry && cookieCountry.length === 2) {
      setDefaultCountry(cookieCountry as Country);
    }
  }, []);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <Flex gap="1" align="center">
        <label className="text-neutral text-sm font-medium">{label}</label>
        <TooltipComponent tooltip={tooltip} />
      </Flex>
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
};