import { Input } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { forwardRef } from "react";

export const PhoneNumberInputComponent = forwardRef<HTMLInputElement>(
  (props, ref) => {
    return (
      <Input
        {...props}
        ref={ref}
        className={cn(
          "border-input shadow-xs h-9 w-full max-w-2xl rounded-l-none rounded-r-md border border-l px-3 text-sm focus:border-secondary focus:ring-ring focus:ring-1",
        )}
        type="tel"
      />
    );
  },
);
