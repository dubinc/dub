"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import { Button, Input } from "@dub/ui";
import { Plus, Xmark } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  APPSFLYER_DEFAULT_SETTINGS,
  APPSFLYER_HARDCODED_PARAMETERS,
  APPSFLYER_MACROS,
} from "../constants";
import { appsFlyerSettingsSchema } from "../schema";
import { updateAppsFlyerSettingsAction } from "../update-settings";

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
  const [parameters, setParameters] = useState(appsFlyerSettings.parameters);

  const { executeAsync: executeUpdate, isPending: isUpdating } = useAction(
    updateAppsFlyerSettingsAction,
    {
      async onSuccess() {
        toast.success("AppsFlyer settings updated successfully.");
      },
      onError({ error }) {
        toast.error(
          error.serverError || "Failed to update AppsFlyer settings.",
        );
      },
    },
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!workspaceId) return;

    const filteredAppIds = appIds.filter((id) => id.trim() !== "");
    const filteredParameters = parameters.filter(
      (p) => p.key.trim() !== "" && p.value.trim() !== "",
    );

    await executeUpdate({
      workspaceId,
      appIds: filteredAppIds,
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
              >
                <Xmark className="size-4" />
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
          {/* Hardcoded parameters */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Lock className="size-3.5 text-neutral-400" />
              <p className="text-xs font-medium uppercase text-neutral-500">
                Default Parameters
              </p>
            </div>
            <div className="space-y-2">
              {APPSFLYER_HARDCODED_PARAMETERS.map((param) => (
                <div key={param.key} className="grid grid-cols-2 gap-2">
                  <Input
                    className="max-w-none"
                    value={param.key}
                    readOnly
                    disabled
                  />
                  <Input
                    className="max-w-none"
                    value={param.value}
                    readOnly
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Custom parameters */}
          <div className="border-t border-neutral-200 pt-4">
            <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
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
                    <Input
                      className="max-w-none"
                      placeholder="e.g., {{PARTNER_NAME}}"
                      type="text"
                      autoComplete="off"
                      value={param.value}
                      onChange={(e) => {
                        const updated = [...parameters];
                        updated[index] = {
                          ...updated[index],
                          value: e.target.value,
                        };
                        setParameters(updated);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setParameters(parameters.filter((_, i) => i !== index))
                    }
                    className="text-neutral-400 transition-colors hover:text-red-500"
                  >
                    <Xmark className="size-4" />
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

            <p className="mt-3 text-xs text-neutral-400">
              Available macros:{" "}
              {APPSFLYER_MACROS.map((m) => m.macro).join(", ")}
            </p>
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
            />
          </div>
        </div>
      </div>
    </form>
  );
};
