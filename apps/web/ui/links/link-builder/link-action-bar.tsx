import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormContext, useFormState } from "react-hook-form";
import { LinkFormData } from "./link-builder-provider";

export function LinkActionBar() {
  const { control, reset } = useFormContext<LinkFormData>();
  const { isDirty, isSubmitting, isSubmitSuccessful, dirtyFields } =
    useFormState({
      control,
    });

  console.log({ isDirty, isSubmitting, dirtyFields });

  const showActionBar = isDirty || isSubmitting;

  return (
    <div
      className={cn(
        "sticky bottom-4 w-full overflow-hidden [filter:drop-shadow(0_5px_8px_#222A351d)]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between overflow-hidden px-4 py-3",
          "rounded-xl border border-neutral-200 bg-white",
          "lg:transition-[opacity,transform]",
          showActionBar ? "" : "lg:translate-y-4 lg:scale-90 lg:opacity-0",
        )}
      >
        <span
          className="hidden text-sm font-medium text-neutral-600 lg:block"
          aria-hidden={!isDirty}
        >
          Unsaved changes
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            text="Discard"
            variant="secondary"
            className="h-7 px-2.5 text-xs"
            disabled={!showActionBar}
            onClick={() => reset()}
          />
          <Button
            type="submit"
            text="Save changes"
            variant="primary"
            className="h-7 px-2.5 text-xs"
            disabled={!showActionBar}
            loading={isSubmitting || isSubmitSuccessful}
          />
        </div>
      </div>
    </div>
  );
}
