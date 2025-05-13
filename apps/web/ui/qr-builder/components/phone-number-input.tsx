import { Input } from "@dub/ui";
import { forwardRef, InputHTMLAttributes } from "react";

export const PhoneNumberInputComponent = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  return (
    <Input
      {...props}
      ref={ref}
      className="border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-l-none rounded-r-md border border-l p-3 text-base focus:ring-0 md:min-w-[400px]"
      type="tel"
    />
  );
});
