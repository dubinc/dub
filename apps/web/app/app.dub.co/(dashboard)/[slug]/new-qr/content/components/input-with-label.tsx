import { Input } from "@dub/ui";
import { ChangeEventHandler, FC, useEffect, useRef } from "react";

interface IInputWithLabelProps {
  label: string;
  type?: "text" | "url" | "tel" | "password" | "textarea";
  placeholder: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  isInputOnFocus?: boolean;
  errorMessage?: string;
}

export const InputWithLabel: FC<IInputWithLabelProps> = ({
  label,
  type = "text",
  isInputOnFocus = false,
  errorMessage,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInputOnFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputOnFocus]);

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="text-neutral text-xs font-medium md:text-sm">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          className="border-border-300 focus:border-secondary h-32 w-full rounded-md border p-3"
          {...props}
        />
      ) : (
        <Input
          type={type}
          ref={inputRef}
          className="border-border-300 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3"
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
