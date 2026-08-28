"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Combobox, ComboboxOption } from "@dub/ui";
import { fetcher, nFormatter } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo } from "react";
import type { Control } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";
import { GOOGLE_ADS_DEFAULT_SETTINGS } from "../constants";
import {
  googleAdsConversionActionSchema,
  googleAdsEventMappingSchema,
  googleAdsSettingsSchema,
} from "../schema";
import { updateGoogleAdsSettingsAction } from "../update-google-ads-settings";

type GoogleAdsCustomerOption = ComboboxOption<{
  descriptiveName: string;
  manager: boolean;
}>;

type EventNameOption = ComboboxOption<{
  count?: number;
}>;

type EventMapping = z.infer<typeof googleAdsEventMappingSchema>;

type FormData = {
  customerId: string;
  loginCustomerId: string;
  customerName: string;
  leadMappings: EventMapping[];
  saleMappings: EventMapping[];
};

type ConversionActionsResponse = {
  conversionActions: z.infer<typeof googleAdsConversionActionSchema>[];
  loginCustomerId: string | null;
};

type EventNameRow = {
  eventName: string;
  leads: number;
  sales: number;
};

const createEmptyMapping = (): EventMapping => ({
  conversionAction: "",
  eventNames: [],
});

const comboboxCaret = (
  <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
);

const comboboxButtonProps = {
  className:
    "h-9 w-full max-w-none justify-between gap-1.5 px-3 py-0 text-sm font-normal shadow-none",
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
      leadMappings: toFormMappings(googleAdsSettings.leadMappings),
      saleMappings: toFormMappings(googleAdsSettings.saleMappings),
    },
  });

  const customerId = watch("customerId");
  const leadMappings = watch("leadMappings");
  const saleMappings = watch("saleMappings");
  const leadConversionAction = leadMappings[0]?.conversionAction ?? "";
  const saleConversionAction = saleMappings[0]?.conversionAction ?? "";
  const leadEventNames = leadMappings[0]?.eventNames ?? [];
  const saleEventNames = saleMappings[0]?.eventNames ?? [];

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

  const {
    data: leadEventNamesData,
    isLoading: isLoadingLeadEventNames,
    error: leadEventNamesError,
  } = useSWR<EventNameRow[]>(
    workspaceId && installed && leadConversionAction
      ? `/api/analytics?event=leads&groupBy=event_names&interval=90d&workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const {
    data: saleEventNamesData,
    isLoading: isLoadingSaleEventNames,
    error: saleEventNamesError,
  } = useSWR<EventNameRow[]>(
    workspaceId && installed && saleConversionAction
      ? `/api/analytics?event=sales&groupBy=event_names&interval=90d&workspaceId=${workspaceId}`
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
    if (leadEventNamesError) {
      toast.error(
        leadEventNamesError.message || "Failed to load lead event names.",
      );
    }
  }, [leadEventNamesError]);

  useEffect(() => {
    if (saleEventNamesError) {
      toast.error(
        saleEventNamesError.message || "Failed to load sale event names.",
      );
    }
  }, [saleEventNamesError]);

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

  const leadEventNameOptions = useMemo(
    () =>
      buildEventNameOptions({
        rows: leadEventNamesData,
        selected: leadEventNames,
        countKey: "leads",
      }),
    [leadEventNamesData, leadEventNames],
  );

  const saleEventNameOptions = useMemo(
    () =>
      buildEventNameOptions({
        rows: saleEventNamesData,
        selected: saleEventNames,
        countKey: "sales",
      }),
    [saleEventNamesData, saleEventNames],
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
      leadMappings: sanitizeMappings(data.leadMappings),
      saleMappings: sanitizeMappings(data.saleMappings),
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
                    setValue("leadMappings", [createEmptyMapping()]);
                    setValue("saleMappings", [createEmptyMapping()]);
                  }}
                  placeholder="Select account"
                  matchTriggerWidth
                  caret={comboboxCaret}
                  buttonProps={comboboxButtonProps}
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
                  action.
                </p>
                <Controller
                  name="leadMappings.0.conversionAction"
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
                      caret={comboboxCaret}
                      buttonProps={comboboxButtonProps}
                    />
                  )}
                />

                {leadConversionAction && (
                  <EventNamesField
                    name="leadMappings.0.eventNames"
                    control={control}
                    options={leadEventNameOptions}
                    isLoading={isLoadingLeadEventNames}
                    label="Lead event names"
                    description="Choose which Dub lead event names to upload as this conversion. If none are selected, all lead events will be sent. Options are based on your top lead events from the last 90 days."
                    placeholder="All lead events"
                    emptyState="No lead events in the last 90 days. Type a name to add one."
                  />
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Sale conversion action
                </p>
                <p className="mb-4 text-sm leading-normal text-neutral-600">
                  Map Dub sale events to an existing Google Ads conversion
                  action.
                </p>
                <Controller
                  name="saleMappings.0.conversionAction"
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
                      caret={comboboxCaret}
                      buttonProps={comboboxButtonProps}
                    />
                  )}
                />

                {saleConversionAction && (
                  <EventNamesField
                    name="saleMappings.0.eventNames"
                    control={control}
                    options={saleEventNameOptions}
                    isLoading={isLoadingSaleEventNames}
                    label="Sale event names"
                    description="Choose which Dub sale event names to upload as this conversion. If none are selected, all sale events will be sent. Options are based on your top sale events from the last 90 days."
                    placeholder="All sale events"
                    emptyState="No sale events in the last 90 days. Type a name to add one."
                  />
                )}
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

function toFormMappings(mappings: EventMapping[]): EventMapping[] {
  if (mappings.length === 0) {
    return [createEmptyMapping()];
  }

  return mappings.map((mapping) => ({
    conversionAction: mapping.conversionAction,
    eventNames: [...mapping.eventNames],
  }));
}

function sanitizeMappings(mappings: EventMapping[]) {
  return mappings
    .filter((mapping) => mapping.conversionAction)
    .map((mapping) => ({
      conversionAction: mapping.conversionAction,
      eventNames: [...new Set(mapping.eventNames)],
    }));
}

function buildEventNameOptions({
  rows,
  selected,
  countKey,
}: {
  rows: EventNameRow[] | undefined;
  selected: string[];
  countKey: "leads" | "sales";
}): EventNameOption[] {
  const fromAnalytics = (rows ?? [])
    .filter((row) => row.eventName)
    .map((row) => ({
      value: row.eventName,
      label: row.eventName,
      meta: { count: row[countKey] },
    }));
  const fromAnalyticsSet = new Set(fromAnalytics.map((option) => option.value));
  const extras = selected
    .filter((name) => !fromAnalyticsSet.has(name))
    .map((name) => ({
      value: name,
      label: name,
    }));

  return [...extras, ...fromAnalytics];
}

function EventNamesField({
  name,
  control,
  options,
  isLoading,
  label,
  description,
  placeholder,
  emptyState,
}: {
  name: "leadMappings.0.eventNames" | "saleMappings.0.eventNames";
  control: Control<FormData>;
  options: EventNameOption[];
  isLoading: boolean;
  label: string;
  description: string;
  placeholder: string;
  emptyState: string;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
      <p className="mb-4 text-sm leading-normal text-neutral-600">
        {description}
      </p>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Combobox
            multiple
            options={isLoading ? undefined : options}
            selected={(field.value ?? []).map(
              (eventName) =>
                options.find((option) => option.value === eventName) ?? {
                  value: eventName,
                  label: eventName,
                },
            )}
            setSelected={(selected) => {
              field.onChange(selected.map((option) => option.value));
            }}
            onCreate={async (search) => {
              const eventName = search.trim();
              if (!eventName) {
                return false;
              }
              const current = field.value ?? [];
              if (!current.includes(eventName)) {
                field.onChange([...current, eventName]);
              }
              return true;
            }}
            createLabel={(search) => `Add "${search.trim()}"`}
            placeholder={isLoading ? "Loading event names..." : placeholder}
            searchPlaceholder="Search or add event names..."
            emptyState={emptyState}
            optionRight={(option) =>
              option.meta?.count != null ? (
                <span className="text-xs text-neutral-500">
                  {nFormatter(option.meta.count, { full: true })}
                </span>
              ) : undefined
            }
            matchTriggerWidth
            caret={comboboxCaret}
            buttonProps={comboboxButtonProps}
          />
        )}
      />
    </div>
  );
}
