"use client";

import { InstalledIntegrationInfoProps } from "@/lib/types";
import { ConfigureWebhook } from "../../common/ui/configure-webhook";
import { supportedEvents } from "../utils";

export const SlackSettings = (props: InstalledIntegrationInfoProps) => {
  const { installed, webhookId } = props;

  return (
    <>
      {installed && webhookId && (
        <ConfigureWebhook
          webhookId={webhookId}
          supportedEvents={supportedEvents}
        />
      )}
    </>
  );
};
