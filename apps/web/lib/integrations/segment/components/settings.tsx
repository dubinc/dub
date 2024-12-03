"use client";

import { SegmentSettingsProps } from "./types";
import { UpdateWriteKey } from "./update-write-key";
import WebhookLinkSelector from "./webhook-link-selector";

export const SegmentSettings = ({
  installed,
  credentials,
}: SegmentSettingsProps) => {
  return (
    <>
      <UpdateWriteKey installed={installed} credentials={credentials} />
      {installed && <WebhookLinkSelector credentials={credentials} />}
    </>
  );
};
