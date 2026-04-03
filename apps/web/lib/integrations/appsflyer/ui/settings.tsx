"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Combobox, ComboboxOption, Input } from "@dub/ui";
import { Plus, Xmark } from "@dub/ui/icons";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  APPSFLYER_DEFAULT_SETTINGS,
  APPSFLYER_HARDCODED_PARAMETERS,
  APPSFLYER_MACROS,
  APPSFLYER_REQUIRED_PARAMETERS,
} from "../constants";
import { appsFlyerSettingsSchema } from "../schema";
import { updateAppsFlyerSettingsAction } from "../update-settings";

type AppsFlyerFormBaseline = {
  appIds: string[];
  requiredParameters: { key: string; value: string }[];
  parameters: { key: string; value: string }[];
};

function cloneFormBaseline(data: AppsFlyerFormBaseline): AppsFlyerFormBaseline {
  return {
    appIds: [...data.appIds],
    requiredParameters: data.requiredParameters.map((p) => ({ ...p })),
    parameters: data.parameters.map((p) => ({ ...p })),
  };
}

type AppsFlyerMacroMeta = { description: string };

const APPSFLYER_MACRO_COMBO_OPTIONS: ComboboxOption<AppsFlyerMacroMeta>[] =
  APPSFLYER_MACROS.map((m) => ({
    value: m.macro,
    label: m.macro,
    meta: { description: m.description },
  }));

function AppsFlyerMacroCombobox({
  value,
  onValueChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const selected =
    APPSFLYER_MACRO_COMBO_OPTIONS.find((o) => o.value === value) ?? null;

  return (
    <Combobox
      options={APPSFLYER_MACRO_COMBO_OPTIONS}
      selected={selected}
      setSelected={(opt) => {
        if (opt) onValueChange(opt.value);
      }}
      placeholder={placeholder ?? "Select macro"}
      matchTriggerWidth
      caret={
        <ChevronDown className="text-content-muted size-3.5 shrink-0 transition-transform duration-75 group-data-[state=open]:rotate-180" />
      }
      popoverProps={{
        contentClassName: "rounded-md p-0.5",
      }}
      inputClassName="py-2 pl-3 text-xs"
      optionClassName="px-2 py-1.5 text-xs leading-tight"
      optionDescription={(option) => option.meta?.description}
      buttonProps={{
        "aria-label": ariaLabel,
        className:
          "h-full w-full max-w-none justify-between gap-1.5 px-2 py-0 text-xs font-normal shadow-none",
      }}
      labelProps={{
        className: "font-mono",
      }}
    />
  );
}

export const AppsFlyerSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const { id: workspaceId } = useWorkspace();

  const appsFlyerSettings = appsFlyerSettingsSchema.parse({
    ...APPSFLYER_DEFAULT_SETTINGS,
    ...(settings as any),
  });

  const [appIds, setAppIds] = useState(appsFlyerSettings.appIds);
  const [requiredParameters, setRequiredParameters] = useState(
    appsFlyerSettings.requiredParameters,
  );
  const [parameters, setParameters] = useState(appsFlyerSettings.parameters);

  const [baseline, setBaseline] = useState<AppsFlyerFormBaseline>(() =>
    cloneFormBaseline(appsFlyerSettings),
  );

  const pendingBaselineRef = useRef<AppsFlyerFormBaseline | null>(null);

  const settingsSignature = JSON.stringify(settings ?? null);

  useEffect(() => {
    const parsed = appsFlyerSettingsSchema.parse({
      ...APPSFLYER_DEFAULT_SETTINGS,
      ...(settings as any),
    });
    const next = cloneFormBaseline(parsed);
    setBaseline(next);
    setAppIds(next.appIds);
    setRequiredParameters(next.requiredParameters);
    setParameters(next.parameters);
  }, [settingsSignature]);

  const isDirty = useMemo(() => {
    const current: AppsFlyerFormBaseline = {
      appIds,
      requiredParameters,
      parameters,
    };
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [appIds, requiredParameters, parameters, baseline]);

  const { executeAsync: executeUpdate, isPending: isUpdating } = useAction(
    updateAppsFlyerSettingsAction,
    {
      async onSuccess() {
        const next = pendingBaselineRef.current;
        if (next) {
          setBaseline(next);
          setAppIds(next.appIds);
          setRequiredParameters(next.requiredParameters);
          setParameters(next.parameters);
          pendingBaselineRef.current = null;
        }
        toast.success("AppsFlyer settings updated successfully.");
      },
      onError({ error }) {
        pendingBaselineRef.current = null;
        toast.error(
          error.serverError || "Failed to update AppsFlyer settings.",
        );
      },
    },
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!workspaceId || !isDirty) return;

    const filteredAppIds = appIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    const normalizedRequired = requiredParameters.map((p) => ({
      key: p.key.trim(),
      value: p.value.trim(),
    }));
    const filteredParameters = parameters
      .map((p) => ({
        key: p.key.trim(),
        value: p.value.trim(),
      }))
      .filter((p) => p.key.length > 0 && p.value.length > 0);

    pendingBaselineRef.current = cloneFormBaseline({
      appIds: filteredAppIds,
      requiredParameters: normalizedRequired,
      parameters: filteredParameters,
    });

    await executeUpdate({
      workspaceId,
      appIds: filteredAppIds,
      requiredParameters: normalizedRequired,
      parameters: filteredParameters,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      {/* App IDs */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">App IDs</p>
          <p className="mt-1 text-sm text-neutral-500">
            Add your AppsFlyer app IDs to identify your workspace when postbacks
            are received.
          </p>
        </div>

        <div className="space-y-3 p-4">
          {appIds.map((appId, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  className="max-w-none"
                  placeholder="e.g., id123456789"
                  type="text"
                  autoComplete="off"
                  aria-label={
                    appIds.length > 1 ? `App ID ${index + 1}` : "App ID"
                  }
                  value={appId}
                  onChange={(e) => {
                    const updated = [...appIds];
                    updated[index] = e.target.value;
                    setAppIds(updated);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setAppIds(appIds.filter((_, i) => i !== index))}
                className="text-neutral-400 transition-colors hover:text-red-500"
                aria-label={
                  appIds.length > 1
                    ? `Remove app ID ${index + 1}`
                    : "Remove app ID"
                }
              >
                <Xmark className="size-4" aria-hidden />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() => setAppIds([...appIds, ""])}
            icon={<Plus className="size-3.5" />}
            text="Add App ID"
            className="h-7 w-fit px-2 text-xs"
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            Tracking Parameters
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Parameters injected into AppsFlyer OneLink URLs when creating
            partner links.
          </p>
        </div>

        <div className="space-y-4 p-4">
          {/* Default parameters */}
          <div>
            <p className="text-content-subtle mb-2 text-xs font-medium">
              Default Parameters
            </p>

            <div className="space-y-2">
              {APPSFLYER_HARDCODED_PARAMETERS.map((param) => (
                <div key={param.key} className="grid grid-cols-2 gap-2">
                  <Input
                    className="max-w-none"
                    value={param.key}
                    readOnly
                    disabled
                    aria-label={`${param.description} — parameter key (${param.key})`}
                  />
                  <Input
                    className="max-w-none font-mono"
                    value={param.value}
                    readOnly
                    disabled
                    aria-label={`${param.description} — parameter value`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Required parameters */}
          <div className="border-t border-neutral-200 pt-4">
            <p className="text-content-subtle mb-2 text-xs font-medium">
              Required Parameters
            </p>

            <div className="space-y-2">
              {requiredParameters.map((param, index) => {
                const defaultParam = APPSFLYER_REQUIRED_PARAMETERS.find(
                  (p) => p.key === param.key,
                );

                return (
                  <div key={param.key} className="grid grid-cols-2 gap-2">
                    <Input
                      className="max-w-none"
                      value={param.key}
                      readOnly
                      disabled
                      aria-label={`${defaultParam?.description ?? param.key} — parameter key`}
                    />
                    <AppsFlyerMacroCombobox
                      value={param.value}
                      onValueChange={(next) => {
                        const updated = [...requiredParameters];
                        updated[index] = {
                          ...updated[index],
                          value: next,
                        };
                        setRequiredParameters(updated);
                      }}
                      ariaLabel={`${defaultParam?.description ?? param.key} — parameter value`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom parameters */}
          <div className="border-t border-neutral-200 pt-4">
            <p className="text-content-subtle mb-2 text-xs font-medium">
              Custom Parameters
            </p>
            <div className="space-y-2">
              {parameters.map((param, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      className="max-w-none"
                      placeholder="Key"
                      type="text"
                      autoComplete="off"
                      aria-label={
                        parameters.length > 1
                          ? `Custom parameter key ${index + 1}`
                          : "Custom parameter key"
                      }
                      value={param.key}
                      onChange={(e) => {
                        const updated = [...parameters];
                        updated[index] = {
                          ...updated[index],
                          key: e.target.value,
                        };
                        setParameters(updated);
                      }}
                    />
                    <AppsFlyerMacroCombobox
                      value={param.value}
                      onValueChange={(next) => {
                        const updated = [...parameters];
                        updated[index] = {
                          ...updated[index],
                          value: next,
                        };
                        setParameters(updated);
                      }}
                      placeholder="Select macro"
                      ariaLabel={
                        parameters.length > 1
                          ? `Custom parameter value ${index + 1}`
                          : "Custom parameter value"
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setParameters(parameters.filter((_, i) => i !== index))
                    }
                    className="text-neutral-400 transition-colors hover:text-red-500"
                    aria-label={
                      parameters.length > 1
                        ? `Remove custom parameter ${index + 1}`
                        : "Remove custom parameter"
                    }
                  >
                    <Xmark className="size-4" aria-hidden />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setParameters([...parameters, { key: "", value: "" }])
                }
                icon={<Plus className="size-3.5" />}
                text="Add Parameter"
                className="h-7 w-fit px-2 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="shrink-0">
            <Button
              type="submit"
              variant="primary"
              text="Save changes"
              className="h-8 w-fit"
              loading={isUpdating}
              disabled={!isDirty || isUpdating}
            />
          </div>
        </div>
      </div>
    </form>
  );
};
