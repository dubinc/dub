import { Campaign } from "@/lib/types";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { useFormState } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

interface CampaignActionBarProps extends PropsWithChildren {
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  campaignStatus: Campaign["status"];
}

export function CampaignActionBar({
  children,
  onSave,
  onReset,
  campaignStatus,
  isSaving = false,
}: CampaignActionBarProps) {
  const { control, reset } = useCampaignFormContext();
  const { isDirty, isSubmitting } = useFormState({
    control,
  });

  // Only show action bar for non-draft campaigns when there are changes
  const showActionBar =
    campaignStatus !== "draft" && (isDirty || isSubmitting || isSaving);

  return (
    <div
      className={cn(
        "sticky bottom-0 w-full shrink-0 overflow-hidden lg:bottom-4 lg:[filter:drop-shadow(0_5px_8px_#222A351d)]",
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
            className="hidden text-sm font-normal text-neutral-600 lg:block"
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
            onClick={() => {
              reset();
              onReset?.();
            }}
            disabled={isSubmitting || isSaving}
          />
          <Button
            type="button"
            text="Save changes"
            variant="primary"
            className="h-7 px-2.5 text-xs"
            loading={isSubmitting || isSaving}
            onClick={onSave}
            disabled={!isDirty}
          />
        </div>
      </div>
    </div>
  );
}
