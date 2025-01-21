"use client";

import {
  InstalledIntegrationInfoProps,
  SegmentIntegrationCredentials,
} from "@/lib/types";
import { ConfigureWebhook } from "../../common/ui/configure-webhook";
import { SetWriteKey } from "./set-write-key";

export const SegmentSettings = (props: InstalledIntegrationInfoProps) => {
  const { installed, credentials, webhookId } = props;

  return (
    <>
      <SetWriteKey
        installed={!!installed?.id}
        credentials={credentials as SegmentIntegrationCredentials}
      />
      {installed && webhookId && (
        <ConfigureWebhook
          webhookId={webhookId}
          supportedEvents={["lead.created", "sale.created"]}
        />
      )}
    </>
  );
};
