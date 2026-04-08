"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover, UserXmark } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NetworkMenu() {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();
  const { program } = useProgram();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <div className="grid w-full gap-px p-2 md:w-56">
          <button
            type="button"
            onClick={() => {
              router.push(`/${workspaceSlug}/program/network/dismissed`);
              setIsOpen(false);
            }}
            className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
          >
            <div className="flex items-center gap-2 text-left">
              <UserXmark className="size-4 shrink-0" />
              <span className="text-sm font-medium">
                View dismissed partners
              </span>
            </div>
          </button>
        </div>
      }
      align="end"
    >
      <Button
        type="button"
        aria-label="Open partner network menu"
        className="w-fit whitespace-nowrap px-2"
        variant="secondary"
        disabled={!program}
        icon={<ThreeDots className="size-4 shrink-0" />}
      />
    </Popover>
  );
}
