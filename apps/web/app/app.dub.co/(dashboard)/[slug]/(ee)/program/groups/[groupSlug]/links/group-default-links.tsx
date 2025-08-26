"use client";

import { Button, Hyperlink } from "@dub/ui";
import { useDefaultPartnerLinkSheet } from "./add-edit-default-partner-link-sheet";

export function GroupDefaultLinks() {
  const { DefaultPartnerLinkSheet, setIsOpen } = useDefaultPartnerLinkSheet({});

  return (
    <div className="flex h-80 flex-col gap-6 rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-content-emphasis text-lg font-semibold leading-7">
            Default partner links
          </h3>
          <p className="text-content-subtle text-sm font-normal leading-5">
            Links that are automatically created for each partner in this group
          </p>
        </div>

        <Button
          text="Create default link"
          variant="primary"
          className="h-8 w-fit rounded-lg px-3"
          onClick={() => setIsOpen(true)}
        />
      </div>

      <NoDefaultLinks />
      {DefaultPartnerLinkSheet}
    </div>
  );
}

function NoDefaultLinks() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-6 rounded-lg bg-neutral-50 p-4">
      <Hyperlink className="size-6 text-neutral-800" />
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-base font-medium text-neutral-900">
          Default partner links
        </h2>
        <p className="text-sm font-normal text-neutral-600">
          No default partner links have been created yet
        </p>
      </div>
    </div>
  );
}
