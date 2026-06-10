"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, Refresh2 } from "@dub/ui";
import Link from "next/link";
import { useState } from "react";

export function RiskCenterMenu() {
  const { slug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full md:w-52">
          <div className="grid gap-px p-2">
            <Link
              href={`/${slug}/program/risks/resolved`}
              onClick={() => setOpenPopover(false)}
            >
              <Button
                variant="outline"
                text="View resolved"
                icon={<Refresh2 className="h-4 w-4" />}
                className="h-9 justify-start rounded-md px-2 font-medium hover:bg-neutral-100 active:bg-neutral-200"
              />
            </Link>
          </div>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      align="end"
    >
      <Button
        onClick={() => setOpenPopover(!openPopover)}
        variant="secondary"
        className="h-8 w-auto px-1.5 sm:h-9"
        icon={<ThreeDots className="h-5 w-5 text-neutral-500" />}
      />
    </Popover>
  );
}
