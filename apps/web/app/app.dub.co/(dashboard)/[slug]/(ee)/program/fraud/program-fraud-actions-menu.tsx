"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, IconMenu, Popover, Refresh2 } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProgramFraudActionsMenu() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full md:w-52">
          <div className="grid gap-px p-2">
            <button
              onClick={() => {
                router.push(`/${slug}/program/fraud/resolved`);
                setOpenPopover(false);
              }}
              className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <IconMenu
                text="View resolved"
                icon={<Refresh2 className="h-4 w-4" />}
              />
            </button>
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
