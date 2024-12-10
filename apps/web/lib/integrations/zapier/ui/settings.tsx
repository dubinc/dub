"use client";

import { InstalledIntegrationInfoProps } from "@/lib/types";
import { WORKSPACE_LEVEL_WEBHOOK_TRIGGERS } from "@/lib/webhook/constants";
import { ConfigureWebhook } from "../../common/ui/configure-webhook";

export const ZapierSettings = (props: InstalledIntegrationInfoProps) => {
  const { installed, webhookId } = props;

  return (
    <>
      {installed && webhookId && (
        <ConfigureWebhook
          webhookId={webhookId}
          supportedEvents={Object.values(WORKSPACE_LEVEL_WEBHOOK_TRIGGERS)}
        />
      )}
    </>
  );
};
