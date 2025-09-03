import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { LinkFormData } from "./link-builder-provider";

export function LinkActionBar({ children }: PropsWithChildren) {
  const { control, reset } = useFormContext<LinkFormData>();
  const { isDirty, isSubmitting, isSubmitSuccessful } = useFormState({
    control,
  });

  const showActionBar = isDirty || isSubmitting;

  return (
    <div
      className={cn(
        "sticky bottom-0 w-full overflow-hidden lg:bottom-4 lg:[filter:drop-shadow(0_5px_8px_#222A351d)]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-center justify-between gap-4 overflow-hidden px-4 py-3",
          "border-t border-neutral-200 bg-white lg:rounded-xl lg:border",
          "lg:transition-[opacity,transform]",
          !showActionBar && "lg:translate-y-4 lg:scale-90 lg:opacity-0",
        )}
      >
        {children || (
          <span
            className="hidden text-sm font-medium text-neutral-600 lg:block"
            aria-hidden={!isDirty}
          >
            Unsaved changes
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            text="Discard"
            variant="secondary"
            className="hidden h-7 px-2.5 text-xs lg:flex"
            onClick={() => reset()}
          />
          <Button
            type="submit"
            text="Save changes"
            variant="primary"
            className="h-7 px-2.5 text-xs"
            loading={isSubmitting || isSubmitSuccessful}
          />
        </div>
      </div>
    </div>
  );
}
