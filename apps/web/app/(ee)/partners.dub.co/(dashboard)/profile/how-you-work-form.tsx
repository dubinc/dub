import { updatePartnerProfileAction } from "@/lib/actions/partners/update-partner-profile";
import { PartnerProps } from "@/lib/types";
import { Button, Check2 } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { SettingsRow } from "./settings-row";

import {
  preferredEarningStructures,
  salesChannels,
} from "@/lib/partners/partner-profile";
import { PreferredEarningStructure, SalesChannel } from "@dub/prisma/client";
import { cn } from "@dub/utils";

type HowYouWorkFormData = {
  preferredEarningStructures: PreferredEarningStructure[];
  salesChannels: SalesChannel[];
};

export function HowYouWorkForm({ partner }: { partner?: PartnerProps }) {
  const {
    control,
    handleSubmit,
    setError,
    getValues,
    reset,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<HowYouWorkFormData>({
    defaultValues: {
      preferredEarningStructures: partner?.preferredEarningStructures ?? [],
      salesChannels: partner?.salesChannels ?? [],
    },
  });

  // Reset form dirty state after submit
  useEffect(() => {
    if (isSubmitSuccessful)
      reset(getValues(), { keepValues: true, keepDirty: false });
  }, [isSubmitSuccessful, reset, getValues]);

  const { executeAsync } = useAction(updatePartnerProfileAction, {
    onSuccess: () => {
      toast.success("Your profile has been updated.");
    },
    onError({ error }) {
      setError("root.serverError", {
        message: error.serverError,
      });

      toast.error(error.serverError);
    },
  });

  return (
    <div className="border-border-subtle divide-border-subtle flex flex-col divide-y rounded-lg border">
      <div className="px-6 py-8">
        <h3 className="text-content-emphasis text-lg font-semibold leading-7">
          How you work
        </h3>
        <p className="text-content-subtle text-sm font-normal leading-5">
          Share how you prefer to earn and promote products to help programs
          understand your style of partnership.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(async (data) => {
          await executeAsync(data);
        })}
      >
        <SettingsRow
          heading="Preferred earning structure"
          description="Choose how you'd like to be rewarded. Select all that apply."
        >
          <div className="@container/panel">
            <div className="@sm/panel:grid-cols-2 grid grid-cols-1 gap-4">
              <Controller
                control={control}
                name="preferredEarningStructures"
                render={({ field }) => (
                  <>
                    {preferredEarningStructures.map((earningStructure) => (
                      <label
                        key={earningStructure.id}
                        className="ring-border-subtle hover:bg-bg-muted flex cursor-pointer select-none items-center gap-2.5 rounded-full bg-white px-4 py-3 ring-1 transition-all duration-100 ease-out"
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={field.value.includes(earningStructure.id)}
                          onChange={(e) =>
                            e.target.checked
                              ? field.onChange([
                                  ...field.value,
                                  earningStructure.id,
                                ])
                              : field.onChange(
                                  field.value.filter(
                                    (id) => id !== earningStructure.id,
                                  ),
                                )
                          }
                        />
                        <div
                          className={cn(
                            "bg-content-inverted border-border-default flex size-4 items-center justify-center rounded border",
                            field.value.includes(earningStructure.id) &&
                              "bg-content-emphasis border-content-emphasis",
                          )}
                        >
                          <Check2
                            className={cn(
                              "text-content-inverted size-3",
                              !field.value.includes(earningStructure.id) &&
                                "opacity-0",
                            )}
                          />
                        </div>
                        <span className="text-content-emphasis text-sm font-medium">
                          {earningStructure.label}
                        </span>
                      </label>
                    ))}
                  </>
                )}
              />
            </div>
          </div>
        </SettingsRow>

        <SettingsRow
          heading="Sales channels"
          description="Where you promote products and links. Select all that apply."
        >
          <div className="@container/panel">
            <div className="@sm/panel:grid-cols-2 grid grid-cols-1 gap-4">
              <Controller
                control={control}
                name="salesChannels"
                render={({ field }) => (
                  <>
                    {salesChannels.map((salesChannel) => (
                      <label
                        key={salesChannel.id}
                        className="ring-border-subtle hover:bg-bg-muted flex cursor-pointer select-none items-center gap-2.5 rounded-full bg-white px-4 py-3 ring-1 transition-all duration-100 ease-out"
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={field.value.includes(salesChannel.id)}
                          onChange={(e) =>
                            e.target.checked
                              ? field.onChange([
                                  ...field.value,
                                  salesChannel.id,
                                ])
                              : field.onChange(
                                  field.value.filter(
                                    (id) => id !== salesChannel.id,
                                  ),
                                )
                          }
                        />
                        <div
                          className={cn(
                            "bg-content-inverted border-border-default flex size-4 items-center justify-center rounded border",
                            field.value.includes(salesChannel.id) &&
                              "bg-content-emphasis border-content-emphasis",
                          )}
                        >
                          <Check2
                            className={cn(
                              "text-content-inverted size-3",
                              !field.value.includes(salesChannel.id) &&
                                "opacity-0",
                            )}
                          />
                        </div>
                        <span className="text-content-emphasis text-sm font-medium">
                          {salesChannel.label}
                        </span>
                      </label>
                    ))}
                  </>
                )}
              />
            </div>
          </div>
        </SettingsRow>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <Button
            text="Save changes"
            className="h-8 w-fit px-2.5"
            loading={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
