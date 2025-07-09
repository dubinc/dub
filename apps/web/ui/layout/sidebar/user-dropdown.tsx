"use client";

import useUser from "@/lib/swr/use-user.ts";
import { Avatar, Icon, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon as IconifyIcon } from "@iconify/react";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ComponentPropsWithoutRef, ElementType, useState } from "react";

export default function UserDropdown() {
  const { user } = useUser();
  const [openPopover, setOpenPopover] = useState(false);
  const { slug } = useParams() as { slug?: string };

  const handleAvatarClick = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "profile",
        content_value: "account_details",
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });

    if (!openPopover) {
      trackClientEvents({
        event: EAnalyticEvents.ELEMENT_OPENED,
        params: {
          page_name: "profile",
          element_name: "account_details",
          email: user?.email,
          event_category: "Authorized",
        },
        sessionId: user?.id,
      });
    }

    setOpenPopover(!openPopover);
  };

  const handleUserOptionClick = (optionType: string) => {
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_CLICKED,
      params: {
        page_name: "profile",
        element_name: "account_details",
        email: user?.email,
        content_value: optionType,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
  };

  return (
    <Popover
      content={
        <div className="flex w-full flex-col space-y-px rounded-md bg-white p-2 sm:w-56">
          {user ? (
            <div className="p-2">
              <p className="truncate text-sm font-medium text-neutral-900">
                {user.name || user.email?.split("@")[0]}
              </p>
              <p className="truncate text-sm text-neutral-500">{user.email}</p>
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
            icon={() => (
              <IconifyIcon
                className="h-4 w-4 text-neutral-200"
                icon="iconoir:profile-circle"
              />
            )}
            href="/account/settings"
            onClick={() => {
              handleUserOptionClick("account");
              setOpenPopover(false);
            }}
          />
          <UserOption
            as={Link}
            label="Plans and Payments"
            icon={() => (
              <IconifyIcon
                className="h-4 w-4 text-neutral-200"
                icon="ion:card-outline"
              />
            )}
            href={`/${slug}/plans`}
            onClick={() => {
              handleUserOptionClick("plans_and_payments");
              setOpenPopover(false);
            }}
          />
          <UserOption
            as="button"
            type="button"
            label="Logout"
            icon={LogOut}
            onClick={() => {
              handleUserOptionClick("logout");
              signOut({
                callbackUrl: "/",
              });
            }}
          />
        </div>
      }
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={handleAvatarClick}
        className={cn(
          "group relative rounded-full ring-offset-1 ring-offset-neutral-100 transition-all hover:ring-2 hover:ring-black/10 active:ring-black/15 data-[state='open']:ring-black/15",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        {user ? (
          <Avatar
            user={user}
            className="size-6 border-none duration-75 sm:size-6"
          />
        ) : (
          <div className="size-6 animate-pulse rounded-full bg-neutral-100 sm:size-6" />
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
      className="hover:bg-border-100 active:bg-secondary-100 flex items-center gap-x-4 rounded-md px-2.5 py-2 text-sm transition-all duration-75"
      {...rest}
    >
      <Icon className="size-4 text-neutral-500" />
      <span className="block truncate text-neutral-600">{label}</span>
      {children}
    </Component>
  );
}
