import { Input } from "@dub/ui";
import { ChangeEventHandler, FC } from "react";

interface IInputWithLabelProps {
  label: string;
  type?: "text" | "url" | "tel" | "password" | "textarea";
  placeholder: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  errorMessage?: string;
  minimalFlow?: boolean;
}

export const InputWithLabel: FC<IInputWithLabelProps> = ({
  label,
  type = "text",
  errorMessage,
  minimalFlow = false,
  value = "",
  onChange,
  placeholder,
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
      <label className="text-neutral text-sm font-medium">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="border-border-500 focus:border-secondary h-32 w-full rounded-md border p-3 text-base"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...props}
        />
      ) : (
        <Input
          type={type}
          className="border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base"
          autoComplete={autoCompleteValue}
          value={value}
          onChange={onChange}
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
