"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  ArrowsOppositeDirectionX,
  Avatar,
  Gift,
  Icon,
  Popover,
  User,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  ComponentPropsWithoutRef,
  ElementType,
  useEffect,
  useState,
} from "react";

export default function UserDropdown() {
  const { data: session } = useSession();
  const { partner } = usePartnerProfile();
  const [openPopover, setOpenPopover] = useState(false);
  const [isPartnerPage, setIsPartnerPage] = useState(false);
  useEffect(() => {
    setIsPartnerPage(window.location.hostname.startsWith("partners."));
  }, []);

  return (
    <Popover
      content={
        <div className="flex w-full flex-col space-y-px rounded-md bg-white p-2 sm:min-w-56">
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
          {...!isPartnerPage
            ? [
                <UserOption
                  as={Link}
                  label="Refer and earn"
                  icon={Gift}
                  href="/account/settings/referrals"
                  onClick={() => setOpenPopover(false)}
                />,
                partner ? (
                  <UserOption
                    as={Link}
                    label="Switch to partner account"
                    icon={ArrowsOppositeDirectionX}
                    href="https://partners.dub.co"
                  />
                ) : null,
              ].filter(Boolean)
            : []}
          <UserOption
            as="button"
            type="button"
            label="Log out"
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
          "group relative flex size-11 items-center justify-center rounded-lg transition-all",
          "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10 transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        {session?.user ? (
          <Avatar
            user={session.user}
            className="size-7 border-none duration-75 sm:size-7"
          />
        ) : (
          <div className="size-7 animate-pulse rounded-full bg-neutral-100" />
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
      className="flex items-center gap-x-4 rounded-md px-2.5 py-1.5 text-sm transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80"
      {...rest}
    >
      <Icon className="size-4 text-neutral-500" />
      <span className="block truncate text-neutral-600">{label}</span>
      {children}
    </Component>
  );
}
