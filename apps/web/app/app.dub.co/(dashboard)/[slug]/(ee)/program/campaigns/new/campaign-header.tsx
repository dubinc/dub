"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  ChevronRight,
  PaperPlane,
  PaperPlane4,
  Popover,
  StatusBadge,
} from "@dub/ui";
import Link from "next/link";
import { useState } from "react";

export function CampaignHeader() {
  const { slug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  const createCampaign = () => {};

  const sendCampaignPreview = () => {
    setOpenPopover(false);
  };

  return (
    <div className="border-border-subtle flex h-16 shrink-0 items-center justify-center gap-4 border-b">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 md:max-w-7xl">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Link
              href={`/${slug}/program/campaigns`}
              aria-label="Back to campaigns"
              title="Back to campaigns"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <PaperPlane className="size-4" />
            </Link>
            <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          </div>

          <h2 className="text-content-emphasis text-lg font-semibold leading-7">
            New automation
          </h2>

          <StatusBadge variant="neutral" icon={null}>
            Draft
          </StatusBadge>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={createCampaign} text="Create" className="h-9" />
          <Popover
            content={
              <div className="w-full md:w-40">
                <Button
                  onClick={sendCampaignPreview}
                  variant="outline"
                  className="w-full"
                  text="Send preview"
                  icon={<PaperPlane4 className="size-4" />}
                />
              </div>
            }
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
            align="end"
          >
            <Button
              onClick={() => setOpenPopover(!openPopover)}
              variant="secondary"
              className="h-8 w-auto px-1.5"
              icon={<ThreeDots className="size-5 text-neutral-500" />}
            />
          </Popover>
        </div>
      </div>
    </div>
  );
}
