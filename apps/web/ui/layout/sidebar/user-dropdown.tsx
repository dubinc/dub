"use client";

import { Avatar, Gift, Icon, Popover, User } from "@dub/ui";
import { cn } from "@dub/utils";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { ComponentPropsWithoutRef, ElementType, useState } from "react";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <Popover
      content={
        <div className="flex w-full flex-col space-y-px rounded-md bg-white p-2 sm:w-56">
          {session?.user ? (
            <div className="p-2">
              <p className="truncate text-sm font-medium text-neutral-900">
                {session.user.name || session.user.email?.split("@")[0]}
              </p>
              <p className="truncate text-sm text-neutral-500">
                {session.user.email}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 px-2 py-3">
              <div className="h-3 w-12 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-neutral-200" />
            </div>
          )}
          <UserOption
            as={Link}
            label="Account"
            icon={User}
            href="/account/settings"
            onClick={() => setOpenPopover(false)}
          />
          {session?.user?.["referralLinkId"] && (
            <UserOption
              as={Link}
              label="Refer and earn"
              icon={Gift}
              href="/account/settings/referrals"
              onClick={() => setOpenPopover(false)}
            />
          )}
          <UserOption
            as="button"
            type="button"
            label="Logout"
            icon={LogOut}
            onClick={() =>
              signOut({
                callbackUrl: "/login",
              })
            }
          />
        </div>
      }
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "group relative rounded-full ring-offset-1 ring-offset-neutral-100 transition-all hover:ring-2 hover:ring-black/10 active:ring-black/15 data-[state='open']:ring-black/15",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        {session?.user ? (
          <Avatar
            user={session.user}
            className="size-6 border-none duration-75 sm:size-6"
          />
        ) : (
          <div className="size-6 animate-pulse rounded-full bg-gray-100 sm:size-6" />
        )}
      </button>
    </Popover>
  );
}

type UserOptionProps<T extends ElementType> = {
  as?: T;
  label: string;
  icon: Icon;
};

function UserOption<T extends ElementType = "button">({
  as,
  label,
  icon: Icon,
  children,
  ...rest
}: UserOptionProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof UserOptionProps<T>>) {
  const Component = as ?? "button";

  return (
    <Component
      className="flex items-center gap-x-4 rounded-md px-2.5 py-2 text-sm transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80"
      {...rest}
    >
      <Icon className="size-4 text-neutral-500" />
      <span className="block truncate text-neutral-600">{label}</span>
      {children}
    </Component>
  );
}
