"use client";

import { InstalledIntegrationInfoProps } from "@/lib/types";
import { ConfigureWebhook } from "../../common/ui/configure-webhook";

export const SlackSettings = (props: InstalledIntegrationInfoProps) => {
  const { installed, webhookId } = props;

  return (
    <>
      {installed && webhookId && (
        <ConfigureWebhook
          webhookId={webhookId}
          supportedEvents={[
            "link.created",
            "link.updated",
            "link.deleted",
            "link.clicked",
            "lead.created",
            "sale.created",
          ]}
        />
      )}
    </>
  );
};
