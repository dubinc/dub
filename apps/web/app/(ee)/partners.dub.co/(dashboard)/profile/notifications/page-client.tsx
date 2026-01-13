"use client";

import { updatePartnerNotificationPreference } from "@/lib/actions/partners/update-partner-notification-preference";
import { partnerNotificationTypes } from "@/lib/zod/schemas/partner-profile";
import {
  CircleCheck,
  Flag6,
  InvoiceDollar,
  Msgs,
  Switch,
  useOptimisticUpdate,
} from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import * as z from "zod/v4";

type PreferenceType = z.infer<typeof partnerNotificationTypes>;
type Preferences = Record<PreferenceType, boolean>;

const notifications = [
  {
    type: "commissionCreated",
    icon: InvoiceDollar,
    title: "New commission event",
    description: "Alert when a new commission event is created.",
  },
  {
    type: "applicationApproved",
    icon: CircleCheck,
    title: "Application approval",
    description: "Alert when an application to a program is approved.",
  },
  {
    type: "newMessageFromProgram",
    icon: Msgs,
    title: "New message from program",
    description: "Alert when a new message is received from a program.",
  },
  {
    type: "marketingCampaign",
    icon: Flag6,
    title: "Marketing campaigns",
    description: "Receive marketing emails from your programs.",
  },
] as const;

export function PartnerSettingsNotificationsPageClient() {
  const {
    data: preferences,
    isLoading,
    update,
  } = useOptimisticUpdate<Preferences>(
    "/api/partner-profile/notification-preferences",
    {
      loading: "Updating notification preference...",
      success: "Notification preference updated.",
      error: "Failed to update notification preference.",
    },
  );

  const { executeAsync } = useAction(updatePartnerNotificationPreference);

  const handleUpdate = async ({
    type,
    value,
    currentPreferences,
  }: {
    type: PreferenceType;
    value: boolean;
    currentPreferences: Preferences;
  }) => {
    await executeAsync({
      type,
      value,
    });

    return {
      ...currentPreferences,
      [type]: value,
    };
  };

  return (
    <div className="mt-2 grid grid-cols-1 gap-3">
      {notifications.map(({ type, icon: Icon, title, description }) => (
        <div
          key={type}
          className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden rounded-full border border-neutral-200 sm:block">
              <div className="rounded-full border border-white bg-gradient-to-t from-neutral-100 p-1 md:p-3">
                <Icon className="size-5" />
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <div className="truncate text-sm font-medium">{title}</div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <span className="whitespace-pre-wrap text-neutral-500">
                  {description}
                </span>
              </div>
            </div>
          </div>
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
  );
}
