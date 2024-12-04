"use client";

import { ConfigureWebhook } from "./configure-webhook";
import { SetWriteKey } from "./set-write-key";
import { SegmentSettingsProps } from "./types";

export const SegmentSettings = ({
  installed,
  credentials,
}: SegmentSettingsProps) => {
  return (
    <>
      <SetWriteKey installed={installed} credentials={credentials} />
      {installed && <ConfigureWebhook credentials={credentials} />}
    </>
  );
};
