"use client";

import { Tooltip } from "@dub/ui";
import { Workflow } from "@dub/ui/icons";

export function KeepPartnerInGroupNotice({
  offerType,
}: {
  offerType: "reward" | "discount";
}) {
  return (
    <Tooltip
      content={`When a custom ${offerType} is set, the partner will be kept in their current group so future [group move rules](https://dub.co/help/article/partner-groups#group-move-rules) can't move them and break their custom ${offerType}.`}
    >
      <span
        className="inline-flex shrink-0 cursor-help rounded-md border border-neutral-200 bg-neutral-100 p-0.5 text-neutral-400"
        aria-label="Group move rules disabled"
      >
        <Workflow className="size-3.5" />
      </span>
    </Tooltip>
  );
}
