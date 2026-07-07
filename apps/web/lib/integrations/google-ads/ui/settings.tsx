"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Combobox, ComboboxOption, Input } from "@dub/ui";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { GOOGLE_ADS_DEFAULT_SETTINGS } from "../constants";
import {
  type GoogleAdsSettingsFormData,
  googleAdsSettingsSchema,
} from "../schema";
import { updateGoogleAdsSettingsAction } from "../update-google-ads-settings";

export const GoogleAdsSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const router = useRouter();
  const { id: workspaceId } = useWorkspace();

  const googleAdsSettings = googleAdsSettingsSchema.parse({
    ...GOOGLE_ADS_DEFAULT_SETTINGS,
    ...(settings as z.infer<typeof googleAdsSettingsSchema>),
  });

  const customerOptions = useMemo<ComboboxOption[]>(
    () =>
      googleAdsSettings.customerIds.map((customerId) => ({
        value: customerId,
        label: customerId,
      })),
    [googleAdsSettings.customerIds],
  );

  const showCustomerSelector = customerOptions.length > 1;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<GoogleAdsSettingsFormData>({
    defaultValues: {
      customerId: googleAdsSettings.customerId ?? "",
      leadConversionActionId: googleAdsSettings.leadConversionActionId ?? "",
      saleConversionActionId: googleAdsSettings.saleConversionActionId ?? "",
    },
  });

  const { executeAsync, isPending } = useAction(updateGoogleAdsSettingsAction, {
    onSuccess({ input }) {
      reset({
        customerId: input.customerId ?? "",
        leadConversionActionId: input.leadConversionActionId ?? "",
        saleConversionActionId: input.saleConversionActionId ?? "",
      });
      router.refresh();
      toast.success("Google Ads settings updated successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update Google Ads settings.");
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) {
      return;
    }

    if (showCustomerSelector && !data.customerId) {
      setError("customerId", {
        message: "Select a Google Ads account to continue.",
      });
      toast.error("Select a Google Ads account to continue.");
      return;
    }

    await executeAsync({
      workspaceId,
      customerId: data.customerId.trim() || null,
      leadConversionActionId: data.leadConversionActionId.trim() || null,
      saleConversionActionId: data.saleConversionActionId.trim() || null,
    });
  });

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            Google Ads Integration Settings
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Offline conversions are uploaded when a Dub lead or sale has a gclid
            on the short link URL. Append{" "}
            <code className="text-xs">?gclid=&#123;gclid&#125;</code> to your
            Dub links in Google Ads.
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Google Ads Customer ID
            </label>
            {showCustomerSelector ? (
              <>
                <Controller
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <Combobox
                      options={customerOptions}
                      selected={
                        customerOptions.find(
                          (option) => option.value === field.value,
                        ) ?? null
                      }
                      setSelected={(option) => {
                        field.onChange(option?.value ?? "");
                      }}
                      placeholder="Select Google Ads account"
                      matchTriggerWidth
                      hideSearch
                      caret={
                        <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                      }
                      popoverProps={{
                        contentClassName: "rounded-md p-0.5",
                      }}
                      optionClassName="px-2 py-1.5 text-xs leading-tight font-mono"
                      buttonProps={{
                        className:
                          "h-9 w-full max-w-none justify-between gap-1.5 px-3 py-0 text-sm font-normal shadow-none",
                      }}
                      labelProps={{
                        className: "font-mono",
                      }}
                    />
                  )}
                />
                {errors.customerId ? (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.customerId.message}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-neutral-400">
                    Multiple Google Ads accounts were found. Choose the account
                    to connect.
                  </p>
                )}
              </>
            ) : (
              <Input
                className="max-w-none font-mono"
                value={googleAdsSettings.customerId ?? ""}
                readOnly
                disabled
              />
            )}
          </div>

          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Lead conversion action ID
            </label>
            <Input
              className="max-w-none font-mono"
              placeholder="e.g. 1234567890"
              {...register("leadConversionActionId")}
            />
            <p className="mt-1 text-xs text-neutral-400">
              In Google Ads → Goals → Conversions, create an &quot;Import from
              clicks&quot; action and paste its ID here.
            </p>
          </div>

          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Sale conversion action ID
            </label>
            <Input
              className="max-w-none font-mono"
              placeholder="e.g. 1234567890"
              {...register("saleConversionActionId")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <Button
            type="submit"
            variant="primary"
            text="Save changes"
            className="h-8 w-fit"
            loading={isPending}
          />
        </div>
      </div>
    </form>
  );
};
