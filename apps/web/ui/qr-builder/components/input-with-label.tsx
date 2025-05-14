import { CountrySelectAutocompleteComponent } from "@/ui/qr-builder/components/country-select-autocomplete.tsx";
import { PhoneNumberInputComponent } from "@/ui/qr-builder/components/phone-number-input.tsx";
import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import { Input } from "@dub/ui";
import { Flex } from "@radix-ui/themes";
import Cookies from "js-cookie";
import { ChangeEventHandler, FC } from "react";
import PhoneInput from "react-phone-number-input";
import { Country } from "react-phone-number-input/input";
import "react-phone-number-input/style.css";

interface IInputWithLabelProps {
  label: string;
  type?: "text" | "url" | "tel" | "password" | "textarea";
  placeholder: string;
  value?: string;
  setValue?: (value: string) => void;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  errorMessage?: string;
  minimalFlow?: boolean;
  initFromPlaceholder?: boolean;
  tooltip?: string;
}

export const InputWithLabel: FC<IInputWithLabelProps> = ({
  label,
  type = "text",
  errorMessage,
  minimalFlow = false,
  value = "",
  setValue,
  onChange,
  placeholder,
  initFromPlaceholder = false,
  tooltip = "",
  ...props
}) => {
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
      break;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Flex gap="1" align="center">
        <label className="text-neutral text-sm font-medium">{label}</label>
        <TooltipComponent tooltip={tooltip} />
      </Flex>

      {type === "textarea" ? (
        <textarea
          className="border-border-500 focus:border-secondary h-36 w-full rounded-md border p-3 text-base"
          value={value}
          onChange={(e) => {
            onChange?.(e);
            setValue?.(e.target.value);
          }}
          placeholder={placeholder}
          {...props}
        />
      ) : type === "tel" ? (
        <PhoneInput
          international
          defaultCountry={(Cookies.get("country") || "US") as Country}
          value={value}
          onChange={(val) => setValue?.(val ?? "")}
          countrySelectComponent={CountrySelectAutocompleteComponent}
          inputComponent={PhoneNumberInputComponent}
          className="w-full [&>div]:w-full"
        />
      ) : (
        <Input
          type={type}
          className="border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base"
          autoComplete={autoCompleteValue}
          value={value}
          onChange={(e) => {
            onChange?.(e);
            setValue?.(e.target.value);
          }}
          onFocus={() => {
            if (initFromPlaceholder && setValue && !value) {
              setValue(placeholder);
            }
          }}
          placeholder={placeholder}
          {...props}
        />
      )}

      {errorMessage && (
        <span className="error-message text-sm text-red-500">
          {errorMessage}
        </span>
      )}
    </div>
  );
};
