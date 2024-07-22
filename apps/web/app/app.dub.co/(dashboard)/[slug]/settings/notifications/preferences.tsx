"use client";

import { updateNotificationPreference } from "@/lib/actions/update-notification-preference";
import useWorkspace from "@/lib/swr/use-workspace";
import { Switch } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import useSWR from "swr";

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

interface PreferenceProps {
  type: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export const NotificationPreferences = () => {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync } = useAction(updateNotificationPreference);

  const {
    data: preferences,
    isLoading,
    mutate,
  } = useSWR<{
    linkUsageSummary: boolean;
    domainConfigurationUpdates: boolean;
  }>(`/api/workspaces/${workspaceId}/notification-preferences`, fetcher, {
    dedupingInterval: 30000,
  });

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
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            notifications.map((notification) => (
              <Preference
                {...notification}
                enabled={preferences ? preferences[notification.type] : false}
                key={notification.type}
                onChange={async (value) => {
                  if (!workspaceId) return;

                  const response = await executeAsync({
                    workspaceId,
                    type: notification.type as any,
                    value,
                  });

                  if (response?.data) {
                    mutate();
                    toast.success("Notification preference saved.");
                  } else {
                    toast.error(response?.serverError?.serverError);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

const Preference = ({
  type,
  description,
  enabled,
  onChange,
}: PreferenceProps) => {
  return (
    <div key={type}>
      <label className="flex items-center font-medium text-gray-700">
        <Switch checked={enabled} fn={(value) => onChange(value)} />
        <span className="ml-2 text-sm text-gray-500">{description}</span>
      </label>
    </div>
  );
};
