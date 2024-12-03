"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Webhook } from "@dub/ui";
import Link from "next/link";

type SlackSettingsProps = InstalledIntegrationInfoProps & {
  credentials: {
    webhookId?: string;
  };
};

export const SlackSettings = ({
  installed,
  credentials,
}: SlackSettingsProps) => {
  const { slug } = useWorkspace();

  if (!installed || !credentials) {
    return null;
  }

  const { webhookId } = credentials;

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
        <Webhook className="size-4" />
        <p className="text-sm font-medium text-gray-700">Configure webhook</p>
      </div>

      <div className="flex items-center justify-between p-6">
        <p className="text-sm leading-normal text-gray-600">
          Customize your Slack notifications by configuring webhook settings.
          You can choose which events to send to Slack and disable the
          notifications.
        </p>

        <Link href={`/${slug}/settings/webhooks/${webhookId}/edit`}>
          <Button className="w-fit" text="Update" variant="secondary" />
        </Link>
      </div>
    </div>
  );
};
