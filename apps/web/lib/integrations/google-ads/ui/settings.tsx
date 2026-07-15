"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Combobox, ComboboxOption } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";
import { GOOGLE_ADS_DEFAULT_SETTINGS } from "../constants";
import {
  googleAdsConversionActionSchema,
  googleAdsSettingsSchema,
} from "../schema";
import { updateGoogleAdsSettingsAction } from "../update-google-ads-settings";

type GoogleAdsCustomerOption = ComboboxOption<{
  descriptiveName: string;
  manager: boolean;
}>;

type FormData = {
  [K in keyof Omit<
    z.infer<typeof googleAdsSettingsSchema>,
    "customers"
  >]: string;
};

type ConversionActionsResponse = {
  conversionActions: z.infer<typeof googleAdsConversionActionSchema>[];
  loginCustomerId: string | null;
};

export const GoogleAdsSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const { id: workspaceId } = useWorkspace();

  const googleAdsSettings = googleAdsSettingsSchema.parse({
    ...GOOGLE_ADS_DEFAULT_SETTINGS,
    ...(settings as any),
  });

  const { control, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      customerId: googleAdsSettings.customerId ?? "",
      loginCustomerId: googleAdsSettings.loginCustomerId ?? "",
      customerName: googleAdsSettings.customerName ?? "",
      leadConversionAction: googleAdsSettings.leadConversionAction ?? "",
      saleConversionAction: googleAdsSettings.saleConversionAction ?? "",
    },
  });

  const customerId = watch("customerId");
  const leadConversionAction = watch("leadConversionAction");
  const saleConversionAction = watch("saleConversionAction");

  const customerOptions = useMemo<GoogleAdsCustomerOption[]>(
    () =>
      googleAdsSettings.customers.map((customer) => ({
        value: customer.id,
        label: customer.descriptiveName,
        meta: {
          descriptiveName: customer.descriptiveName,
          manager: customer.manager,
        },
      })),
    [googleAdsSettings.customers],
  );

  const {
    data: conversionActionsData,
    isLoading: isLoadingOptions,
    error: conversionActionsError,
  } = useSWR<ConversionActionsResponse>(
    workspaceId && installed && customerId
      ? `/api/google-ads/conversion-actions?workspaceId=${workspaceId}&customerId=${customerId}`
      : null,
    fetcher,
  );

  useEffect(() => {
    if (conversionActionsError) {
      toast.error(
        conversionActionsError.message ||
          "Failed to load Google Ads conversion actions.",
      );
    }
  }, [conversionActionsError]);

  useEffect(() => {
    if (!conversionActionsData) {
      return;
    }

    setValue("loginCustomerId", conversionActionsData.loginCustomerId ?? "");
  }, [conversionActionsData, setValue]);

  const conversionActionOptions = useMemo<ComboboxOption[]>(
    () =>
      (conversionActionsData?.conversionActions ?? []).map((action) => ({
        value: action.resourceName,
        label: action.name,
      })),
    [conversionActionsData?.conversionActions],
  );

  const { executeAsync: saveSettings, isPending: isSaving } = useAction(
    updateGoogleAdsSettingsAction,
    {
      onSuccess() {
        toast.success("Google Ads settings updated successfully.");
      },
      onError({ error }) {
        toast.error(
          error.serverError || "Failed to update Google Ads settings.",
        );
      },
    },
  );

  const selectedCustomer = useMemo(
    () => customerOptions.find((option) => option.value === customerId) ?? null,
    [customerOptions, customerId],
  );

  const selectedLeadAction = useMemo(
    () =>
      conversionActionOptions.find(
        (option) => option.value === leadConversionAction,
      ) ?? null,
    [conversionActionOptions, leadConversionAction],
  );

  const selectedSaleAction = useMemo(
    () =>
      conversionActionOptions.find(
        (option) => option.value === saleConversionAction,
      ) ?? null,
    [conversionActionOptions, saleConversionAction],
  );

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    await saveSettings({
      workspaceId,
      customerId: data.customerId || null,
      loginCustomerId: data.loginCustomerId || null,
      customerName: data.customerName || null,
      leadConversionAction: data.leadConversionAction || null,
      saleConversionAction: data.saleConversionAction || null,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            Google Ads Integration Settings
          </p>
        </div>

        <div className="space-y-6 p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Google Ads account
            </p>
            <p className="mb-4 text-sm leading-normal text-neutral-600">
              Select the Google Ads account where Dub should upload offline
              click conversions.
            </p>
            <Controller
              name="customerId"
              control={control}
              render={() => (
                <Combobox
                  options={customerOptions}
                  selected={selectedCustomer}
                  setSelected={(option) => {
                    if (!option) {
                      return;
                    }

                    setValue("customerId", option.value);
                    setValue("customerName", option.label);
                    setValue("loginCustomerId", "");
                    setValue("leadConversionAction", "");
                    setValue("saleConversionAction", "");
                  }}
                  placeholder="Select account"
                  matchTriggerWidth
                  caret={
                    <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                  }
                  buttonProps={{
                    className:
                      "h-9 w-full max-w-none justify-between gap-1.5 px-3 py-0 text-sm font-normal shadow-none",
                  }}
                />
              )}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Only accounts you have permission to access are shown. If an
              account is missing, check your Google Ads access and reconnect.
            </p>
          </div>

          {customerId && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Lead conversion action
                </p>
                <p className="mb-4 text-sm leading-normal text-neutral-600">
                  Map Dub lead events to an existing Google Ads conversion
                  action with type UPLOAD_CLICKS.
                </p>
                <Controller
                  name="leadConversionAction"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={conversionActionOptions}
                      selected={selectedLeadAction}
                      setSelected={(option) => {
                        if (option) {
                          field.onChange(option.value);
                        }
                      }}
                      placeholder={
                        isLoadingOptions
                          ? "Loading conversion actions..."
                          : "Select lead conversion action"
                      }
                      matchTriggerWidth
                      caret={
                        <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                      }
                      buttonProps={{
                        className:
                          "h-9 w-full max-w-none justify-between gap-1.5 px-3 py-0 text-sm font-normal shadow-none",
                      }}
                    />
                  )}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Sale conversion action
                </p>
                <p className="mb-4 text-sm leading-normal text-neutral-600">
                  Map Dub sale events to an existing Google Ads conversion
                  action with type UPLOAD_CLICKS.
                </p>
                <Controller
                  name="saleConversionAction"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={conversionActionOptions}
                      selected={selectedSaleAction}
                      setSelected={(option) => {
                        if (option) {
                          field.onChange(option.value);
                        }
                      }}
                      placeholder={
                        isLoadingOptions
                          ? "Loading conversion actions..."
                          : "Select sale conversion action"
                      }
                      matchTriggerWidth
                      caret={
                        <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                      }
                      buttonProps={{
                        className:
                          "h-9 w-full max-w-none justify-between gap-1.5 px-3 py-0 text-sm font-normal shadow-none",
                      }}
                    />
                  )}
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            text="Save settings"
            loading={isSaving}
            disabled={!customerId || isLoadingOptions}
          />
        </div>
      </div>
    </form>
  );
};
