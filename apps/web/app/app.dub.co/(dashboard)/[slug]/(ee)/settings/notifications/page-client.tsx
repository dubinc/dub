"use client";

import { updateWorkspaceNotificationPreference } from "@/lib/actions/update-workspace-notification-preference";
import useWorkspace from "@/lib/swr/use-workspace";
import { notificationTypes } from "@/lib/zod/schemas/workspaces";
import { Switch, useOptimisticUpdate } from "@dub/ui";
import { Globe, Hyperlink, Msgs, UserPlus } from "@dub/ui/icons";
import { isClickOnInteractiveChild } from "@dub/utils";
import { DollarSign, Trophy } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React from "react";
import { z } from "zod";

type PreferenceType = z.infer<typeof notificationTypes>;
type Preferences = Record<PreferenceType, boolean>;

export default function NotificationsSettingsPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync } = useAction(updateWorkspaceNotificationPreference);

  const workspaceNotifications = [
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

  const partnerProgramNotifications = [
    {
      type: "newPartnerApplication",
      icon: UserPlus,
      title: "New partner application",
      description:
        "Alert when a new partner application is made in your partner program.",
    },
    {
      type: "newPartnerSale",
      icon: DollarSign,
      title: "New partner sale",
      description: "Alert when a new sale is made in your partner program.",
    },
    {
      type: "newBountySubmitted",
      icon: Trophy,
      title: "New bounty submitted",
      description:
        "Alert when a new bounty is submitted in your partner program.",
    },
    {
      type: "newMessageFromPartner",
      icon: Msgs,
      title: "New message from partner",
      description:
        "Alert when a new message is received from a partner in your partner program.",
    },
    // {
    //   type: "fraudEventsSummary",
    //   icon: ShieldAlert,
    //   title: "Daily Fraud events summary",
    //   description:
    //     "Daily summary email of unresolved fraud events detected in your partner program.",
    // },
  ];

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

  const renderNotificationItem = ({
    type,
    icon: Icon,
    title,
    description,
    isLast,
  }: {
    type: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    isLast?: boolean;
  }) => {
    const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isClickOnInteractiveChild(e) || !preferences || isLoading) return;

      const newValue = !preferences[type];
      update(
        () =>
          handleUpdate({
            type,
            value: newValue,
            currentPreferences: preferences,
          }),
        {
          ...preferences,
          [type]: newValue,
        },
      );
    };

    return (
      <div key={type}>
        <div
          onClick={handleRowClick}
          className="flex cursor-pointer items-start justify-between py-5 pr-2 sm:items-center"
        >
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <div className="flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 pr-4">
              <div className="text-sm font-medium text-neutral-800">
                {title}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {description}
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
        {!isLast && <div className="border-t border-neutral-200" />}
      </div>
    );
  };

  const renderSection = ({
    title,
    notifications,
  }: {
    title: string;
    notifications: Array<{
      type: string;
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      description: string;
    }>;
  }) => (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="px-5">
        {notifications.map((notification, index) =>
          renderNotificationItem({
            ...notification,
            isLast: index === notifications.length - 1,
          }),
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {renderSection({
        title: "Short links",
        notifications: workspaceNotifications,
      })}
      {renderSection({
        title: "Partner program",
        notifications: partnerProgramNotifications,
      })}
    </div>
  );
}
