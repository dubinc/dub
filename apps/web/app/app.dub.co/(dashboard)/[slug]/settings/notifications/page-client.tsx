"use client";

import { updateNotificationPreference } from "@/lib/actions/update-notification-preference";
import useWorkspace from "@/lib/swr/use-workspace";
import { Switch, useOptimisticUpdate } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";

type PreferenceType = "linkUsageSummary" | "domainConfigurationUpdates";

type Preferences = Record<PreferenceType, boolean>;

const notifications: {
  type: PreferenceType;
  description: string;
}[] = [
  {
    type: "linkUsageSummary",
    description: "Monthly links usage summary",
  },
  {
    type: "domainConfigurationUpdates",
    description: "Domain configuration warnings",
  },
];

export default function NotificationsSettingsPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync } = useAction(updateNotificationPreference);

  const {
    data: preferences,
    isLoading,
    update,
  } = useOptimisticUpdate<Preferences>(
    `/api/workspaces/${workspaceId}/notification-preferences`,
    {
      loading: "Updating notification preference...",
      success: "Notification preference updated.",
      error: "Failed to update notification preference.",
    },
  );

  const handleUpdate = async ({
    type,
    value,
    currentPreferences,
  }: {
    type: string;
    value: boolean;
    currentPreferences: Preferences;
  }) => {
    await executeAsync({
      workspaceId: workspaceId!,
      type: type as PreferenceType,
      value,
    });

    return {
      ...currentPreferences,
      [type]: value,
    };
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between gap-4 space-y-3 border-b border-gray-200 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex max-w-screen-sm flex-col space-y-3">
            <h2 className="text-xl font-medium">Workspace Notifications</h2>
            <p className="text-sm text-gray-500">
              Adjust your personal notification preferences and choose which
              updates you want to receive.
              <br />
              These settings will only be applied to your personal account and
              will not affect your workspace-level settings.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 sm:p-10">
          {notifications.map((notification) => (
            <div key={notification.type}>
              <label className="flex items-center font-medium text-gray-700">
                <Switch
                  checked={preferences?.[notification.type] ?? false}
                  disabled={isLoading}
                  fn={(checked: boolean) => {
                    if (!preferences) return;

                    update(
                      () =>
                        handleUpdate({
                          type: notification.type,
                          value: checked,
                          currentPreferences: preferences,
                        }),
                      {
                        ...preferences,
                        [notification.type]: checked,
                      },
                    );
                  }}
                />
                <span className="ml-2 text-sm text-gray-500">
                  {notification.description}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
