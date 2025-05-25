import { Input } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { forwardRef, InputHTMLAttributes } from "react";

interface PhoneNumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const PhoneNumberInputComponent = forwardRef<
  HTMLInputElement,
  PhoneNumberInputProps
>((props, ref) => {
  const { hasError, className, ...rest } = props;

  return (
    <Input
      {...rest}
      ref={ref}
      className={cn(
        "border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-l-none rounded-r-md border border-l p-3 text-base focus:ring-0 md:min-w-[400px]",
        {
          "border-red-500": hasError,
        },
        className,
      )}
      type="tel"
    />
  );
});
