"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, IconMenu, Popover } from "@dub/ui";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomersDropdownMenu() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="w-full md:w-[14rem]">
          <div className="grid gap-px p-2">
            <button
              onClick={() => {
                setOpenPopover(false);
                router.push(`/${slug}/program/customers/referrals`);
              }}
              className="w-full rounded-md p-2 hover:bg-neutral-100 active:bg-neutral-200"
            >
              <IconMenu
                text="Partner referral form"
                icon={<ExternalLink className="h-4 w-4" />} // TODO: Fix the icon
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
        icon={<ThreeDots className="size-4 text-neutral-500" />}
      />
    </Popover>
  );
}
