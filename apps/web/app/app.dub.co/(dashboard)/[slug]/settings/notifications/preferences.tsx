"use client";

import { updateNotificationPreference } from "@/lib/actions/update-notification-preference";
import useWorkspace from "@/lib/swr/use-workspace";
import { Switch, useOptimisticUpdate } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";

const notifications = [
  {
    type: "linkUsageSummary",
    description: "Monthly links usage summary",
  },
  {
    type: "domainConfigurationUpdates",
    description: "Domain configuration warnings",
  },
];

export const NotificationPreferences = () => {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync } = useAction(updateNotificationPreference);

  const {
    data: preferences,
    isLoading,
    update,
  } = useOptimisticUpdate<{
    linkUsageSummary: boolean;
    domainConfigurationUpdates: boolean;
  }>(`/api/workspaces/${workspaceId}/notification-preferences`, {
    loading: "Updating notification preference...",
    success: "Notification preference updated.",
    error: "Failed to update notification preference.",
  });

  const handleUpdate = async ({
    type,
    value,
  }: {
    type: string;
    value: boolean;
  }) => {
    await executeAsync({
      workspaceId: workspaceId!,
      type: type as "linkUsageSummary" | "domainConfigurationUpdates",
      value,
    });

    return {
      ...preferences,
      [type]: value,
    };
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between gap-4 space-y-3 border-b border-gray-200 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex max-w-screen-sm flex-col space-y-3">
            <h2 className="text-xl font-medium">Notifications</h2>
            <p className="text-sm text-gray-500">
              Adjust your notification preferences and choose which updates you
              want to receive.
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
                    update(
                      () =>
                        handleUpdate({
                          type: notification.type,
                          value: checked,
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
};
