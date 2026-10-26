"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { Plus, Xmark } from "@dub/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { APPSFLYER_DEFAULT_SETTINGS } from "../constants";
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
  const [baseline, setBaseline] = useState<string[]>(() => [
    ...appsFlyerSettings.appIds,
  ]);

  const pendingBaselineRef = useRef<string[] | null>(null);

  const settingsSignature = JSON.stringify(settings ?? null);

  useEffect(() => {
    const parsed = appsFlyerSettingsSchema.parse({
      ...APPSFLYER_DEFAULT_SETTINGS,
      ...(settings as any),
    });
    setBaseline([...parsed.appIds]);
    setAppIds([...parsed.appIds]);
  }, [settingsSignature]);

  const isDirty = useMemo(
    () => JSON.stringify(appIds) !== JSON.stringify(baseline),
    [appIds, baseline],
  );

  const { executeAsync: executeUpdate, isPending: isUpdating } = useAction(
    updateAppsFlyerSettingsAction,
    {
      async onSuccess() {
        const next = pendingBaselineRef.current;
        if (next) {
          setBaseline(next);
          setAppIds(next);
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

    pendingBaselineRef.current = [...filteredAppIds];

    await executeUpdate({
      workspaceId,
      appIds: filteredAppIds,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
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
