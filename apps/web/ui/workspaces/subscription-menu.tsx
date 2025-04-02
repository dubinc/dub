"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  CalendarRefresh,
  Icon,
  LoadingSpinner,
  Popover,
  SquareXmark,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ThreeDots } from "../shared/icons";

export default function SubscriptionMenu() {
  const { id: workspaceId } = useWorkspace();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [clicked, setClicked] = useState(false);

  const openBillingPortal = (cancel: boolean) => {
    setIsOpen(false);
    setClicked(true);
    return fetch(
      `/api/workspaces/${workspaceId}/billing/${cancel ? "cancel" : "manage"}`,
      {
        method: "POST",
      },
    ).then(async (res) => {
      if (res.ok) {
        const url = await res.json();
        router.push(url);
      } else {
        const { error } = await res.json();
        toast.error(error.message);
        setClicked(false);
      }
    });
  };

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command
          tabIndex={0}
          loop
          className="pointer-events-auto focus:outline-none"
        >
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[180px]">
            <MenuItem
              icon={CalendarRefresh}
              label="Manage Subscription"
              onSelect={() => openBillingPortal(false)}
            />
            <MenuItem
              icon={SquareXmark}
              label="Cancel Subscription"
              onSelect={() => openBillingPortal(true)}
            />
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-9 px-2"
        variant="secondary"
        icon={
          clicked ? (
            <LoadingSpinner className="size-4 shrink-0" />
          ) : (
            <ThreeDots className="size-4 shrink-0" />
          )
        }
        disabled={clicked}
      />
    </Popover>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabled,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-neutral-100",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onSelect={onSelect}
      disabled={disabled}
    >
      <IconComp className="size-4 shrink-0 text-neutral-700" />
      {label}
    </Command.Item>
  );
}
