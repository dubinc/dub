"use client";

import { updateNotificationPreference } from "@/lib/actions/update-notification-preference";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { Switch, useOptimisticUpdate } from "@dub/ui";
import { Globe, Hyperlink } from "@dub/ui/src/icons";
import { useAction } from "next-safe-action/hooks";

type PreferenceType = "linkUsageSummary" | "domainConfigurationUpdates";

type Preferences = Record<PreferenceType, boolean>;

const notifications: {
  type: PreferenceType;
  icon: React.ElementType;
  title: string;
  description: string;
}[] = [
  {
    type: "domainConfigurationUpdates",
    icon: Globe,
    title: "Domain configuration updates",
    description: "Updates to your custom domain configuration.",
  },
  {
    type: "linkUsageSummary",
    icon: Hyperlink,
    title: "Monthly links usage summary",
    description:
      "Monthly summary email of your top 5 links by usage & total links created.",
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
          {notifications.map(({ type, icon, title, description }) => (
            <div
              key={type}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <DomainCardTitleColumn
                domain={title}
                icon={icon}
                description={description}
              />
              <Switch
                checked={preferences?.[type] ?? false}
                disabled={isLoading}
                fn={(checked: boolean) => {
                  if (!preferences) return;

                  update(
                    () =>
                      handleUpdate({
                        type,
                        value: checked,
                        currentPreferences: preferences,
                      }),
                    {
                      ...preferences,
                      [type]: checked,
                    },
                  );
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
