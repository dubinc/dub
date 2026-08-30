"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { BlurImage, Button, Combobox, ComboboxOption } from "@dub/ui";
import { Plus, Xmark } from "@dub/ui/icons";
import { DUB_LOGO, fetcher, nFormatter } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo } from "react";
import type { Control } from "react-hook-form";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";
import { GOOGLE_ADS_DEFAULT_SETTINGS, GOOGLE_ADS_LOGO } from "../constants";
import {
  googleAdsConversionActionSchema,
  googleAdsEventMappingSchema,
  googleAdsSettingsSchema,
} from "../schema";
import { updateGoogleAdsSettingsAction } from "../update-google-ads-settings";
import { getGoogleAdsEventMappingsError } from "../utils";

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

const MAX_MAPPINGS = 50;

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

  const { control, handleSubmit, setValue } = useForm<FormData>({
    defaultValues: {
      customerId: googleAdsSettings.customerId ?? "",
      loginCustomerId: googleAdsSettings.loginCustomerId ?? "",
      customerName: googleAdsSettings.customerName ?? "",
      leadMappings: toFormMappings(googleAdsSettings.leadMappings),
      saleMappings: toFormMappings(googleAdsSettings.saleMappings),
    },
  });

  const customerId = useWatch({ control, name: "customerId" });

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
    workspaceId && installed && customerId
      ? `/api/analytics?event=leads&groupBy=event_names&interval=90d&workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const {
    data: saleEventNamesData,
    isLoading: isLoadingSaleEventNames,
    error: saleEventNamesError,
  } = useSWR<EventNameRow[]>(
    workspaceId && installed && customerId
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

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) {
      return;
    }

    const leadMappings = sanitizeMappings(data.leadMappings);
    const saleMappings = sanitizeMappings(data.saleMappings);

    const leadMappingsError = getGoogleAdsEventMappingsError(leadMappings);
    if (leadMappingsError) {
      toast.error(`Lead events: ${leadMappingsError}`);
      return;
    }

    const saleMappingsError = getGoogleAdsEventMappingsError(saleMappings);
    if (saleMappingsError) {
      toast.error(`Sale events: ${saleMappingsError}`);
      return;
    }

    await saveSettings({
      workspaceId,
      customerId: data.customerId || null,
      loginCustomerId: data.loginCustomerId || null,
      customerName: data.customerName || null,
      leadMappings,
      saleMappings,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              <EventMappingsSection
                name="leadMappings"
                control={control}
                title="Lead events"
                description="Map Dub lead events to Google Ads conversion actions. Each event name can only be assigned to one conversion action."
                conversionActionPlaceholder={
                  isLoadingOptions
                    ? "Loading conversion actions..."
                    : "Select lead conversion action"
                }
                eventNamesPlaceholder="All unmatched lead events"
                eventNamesEmptyState="No lead events in the last 90 days. Type a name to add one."
                conversionActionOptions={conversionActionOptions}
                eventNameRows={leadEventNamesData}
                eventCountKey="leads"
                isLoadingConversionActions={isLoadingOptions}
                isLoadingEventNames={isLoadingLeadEventNames}
              />

              <div className="border-t border-neutral-200 pt-6">
                <EventMappingsSection
                  name="saleMappings"
                  control={control}
                  title="Sale events"
                  description="Map Dub sale events to Google Ads conversion actions. Each event name can only be assigned to one conversion action."
                  conversionActionPlaceholder={
                    isLoadingOptions
                      ? "Loading conversion actions..."
                      : "Select sale conversion action"
                  }
                  eventNamesPlaceholder="All unmatched sale events"
                  eventNamesEmptyState="No sale events in the last 90 days. Type a name to add one."
                  conversionActionOptions={conversionActionOptions}
                  eventNameRows={saleEventNamesData}
                  eventCountKey="sales"
                  isLoadingConversionActions={isLoadingOptions}
                  isLoadingEventNames={isLoadingSaleEventNames}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <Button
            type="submit"
            variant="primary"
            text="Save changes"
            className="h-8 w-fit"
            loading={isSaving}
            disabled={!customerId || isLoadingOptions}
          />
        </div>
      </div>
    </form>
  );
};

function EventMappingsSection({
  name,
  control,
  title,
  description,
  conversionActionPlaceholder,
  eventNamesPlaceholder,
  eventNamesEmptyState,
  conversionActionOptions,
  eventNameRows,
  eventCountKey,
  isLoadingConversionActions,
  isLoadingEventNames,
}: {
  name: "leadMappings" | "saleMappings";
  control: Control<FormData>;
  title: string;
  description: string;
  conversionActionPlaceholder: string;
  eventNamesPlaceholder: string;
  eventNamesEmptyState: string;
  conversionActionOptions: ComboboxOption[];
  eventNameRows: EventNameRow[] | undefined;
  eventCountKey: "leads" | "sales";
  isLoadingConversionActions: boolean;
  isLoadingEventNames: boolean;
}) {
  const mappings = useWatch({ control, name }) ?? [];
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const conversionActionLabelByValue = useMemo(() => {
    return new Map(
      conversionActionOptions.map((option) => [option.value, option.label]),
    );
  }, [conversionActionOptions]);

  const canAddMapping =
    mappings.length > 0 &&
    mappings.every((mapping) => mapping.conversionAction) &&
    mappings.length < MAX_MAPPINGS &&
    mappings.length < conversionActionOptions.length;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-neutral-700">{title}</p>
      <p className="mb-4 text-sm text-neutral-500">{description}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <FieldLabel src={GOOGLE_ADS_LOGO} alt="Google Ads">
              Conversion action
            </FieldLabel>
            <FieldLabel src={DUB_LOGO} alt="Dub">
              Event names
            </FieldLabel>
          </div>
          {fields.length > 1 && <div className="size-4 shrink-0" />}
        </div>

        {fields.map((field, index) => {
          const mapping = mappings[index] ?? createEmptyMapping();
          const selectedConversionAction =
            conversionActionOptions.find(
              (option) => option.value === mapping.conversionAction,
            ) ?? null;
          const usedConversionActions = new Set(
            mappings
              .filter((_, mappingIndex) => mappingIndex !== index)
              .map((item) => item.conversionAction)
              .filter(Boolean),
          );
          const usedEventNames = new Map<string, string>();
          mappings.forEach((item, mappingIndex) => {
            if (mappingIndex === index) {
              return;
            }

            const actionLabel =
              conversionActionLabelByValue.get(item.conversionAction) ??
              "another conversion action";

            for (const eventName of item.eventNames) {
              usedEventNames.set(eventName, String(actionLabel));
            }
          });

          return (
            <div key={field.id} className="flex items-center gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <Controller
                  name={`${name}.${index}.conversionAction`}
                  control={control}
                  render={({ field: conversionActionField }) => (
                    <Combobox
                      options={conversionActionOptions.map((option) => ({
                        ...option,
                        disabledTooltip: usedConversionActions.has(option.value)
                          ? "Already used by another mapping"
                          : undefined,
                      }))}
                      selected={selectedConversionAction}
                      setSelected={(option) => {
                        if (option) {
                          conversionActionField.onChange(option.value);
                        }
                      }}
                      placeholder={conversionActionPlaceholder}
                      matchTriggerWidth
                      caret={comboboxCaret}
                      buttonProps={comboboxButtonProps}
                    />
                  )}
                />

                <EventNamesField
                  name={`${name}.${index}.eventNames`}
                  control={control}
                  options={buildEventNameOptions({
                    rows: eventNameRows,
                    selected: mapping.eventNames,
                    usedByOthers: usedEventNames,
                    countKey: eventCountKey,
                  })}
                  usedByOthers={usedEventNames}
                  isLoading={isLoadingEventNames}
                  disabled={!mapping.conversionAction}
                  placeholder={
                    !mapping.conversionAction
                      ? "Select a conversion action first"
                      : mappings.filter((item) => item.conversionAction)
                            .length > 1
                        ? eventNamesPlaceholder
                        : eventNamesPlaceholder.replace("unmatched ", "")
                  }
                  emptyState={eventNamesEmptyState}
                />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-neutral-400 transition-colors hover:text-red-500"
                  aria-label={`Remove mapping ${index + 1}`}
                >
                  <Xmark className="size-4" aria-hidden />
                </button>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          onClick={() => append(createEmptyMapping())}
          icon={<Plus className="size-3.5" />}
          text="Add mapping"
          className="h-7 w-fit px-2 text-xs"
          disabled={!canAddMapping || isLoadingConversionActions}
        />
      </div>
    </div>
  );
}

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
  usedByOthers,
  countKey,
}: {
  rows: EventNameRow[] | undefined;
  selected: string[];
  usedByOthers: Map<string, string>;
  countKey: "leads" | "sales";
}): EventNameOption[] {
  const fromAnalytics = (rows ?? [])
    .filter((row) => row.eventName)
    .map((row) => ({
      value: row.eventName,
      label: row.eventName,
      meta: { count: row[countKey] },
      disabledTooltip: usedByOthers.has(row.eventName)
        ? `Already mapped to ${usedByOthers.get(row.eventName)}`
        : undefined,
    }));
  const fromAnalyticsSet = new Set(fromAnalytics.map((option) => option.value));
  const extras = selected
    .filter((eventName) => !fromAnalyticsSet.has(eventName))
    .map((eventName) => ({
      value: eventName,
      label: eventName,
    }));

  return [...extras, ...fromAnalytics];
}

function FieldLabel({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <BlurImage
        src={src}
        alt={alt}
        width={16}
        height={16}
        className={cn(
          "size-4 shrink-0 object-contain",
          src === DUB_LOGO ? "size-3.5 rounded-sm" : "",
        )}
      />
      <span className="text-sm font-medium text-neutral-700">{children}</span>
    </div>
  );
}

function EventNamesField({
  name,
  control,
  options,
  usedByOthers,
  isLoading,
  disabled,
  placeholder,
  emptyState,
}: {
  name:
    | `leadMappings.${number}.eventNames`
    | `saleMappings.${number}.eventNames`;
  control: Control<FormData>;
  options: EventNameOption[];
  usedByOthers: Map<string, string>;
  isLoading: boolean;
  disabled: boolean;
  placeholder: string;
  emptyState: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Combobox
          multiple
          options={isLoading || disabled ? undefined : options}
          selected={(field.value ?? []).map(
            (eventName) =>
              options.find((option) => option.value === eventName) ?? {
                value: eventName,
                label: eventName,
              },
          )}
          setSelected={(selected) => {
            if (disabled) {
              return;
            }
            field.onChange(selected.map((option) => option.value));
          }}
          onCreate={async (search) => {
            if (disabled) {
              return false;
            }

            const eventName = search.trim();
            if (!eventName) {
              return false;
            }

            const usedBy = usedByOthers.get(eventName);
            if (usedBy) {
              toast.error(`Already mapped to ${usedBy}`);
              return false;
            }

            const current = field.value ?? [];
            if (!current.includes(eventName)) {
              field.onChange([...current, eventName]);
            }
            return true;
          }}
          createLabel={(search) => `Add "${search.trim()}"`}
          placeholder={
            isLoading && !disabled ? "Loading event names..." : placeholder
          }
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
          buttonProps={{
            ...comboboxButtonProps,
            disabled,
          }}
        />
      )}
    />
  );
}
