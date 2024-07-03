"use client";

import { APP_DOMAIN, cn, fetcher } from "@dub/utils";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ElementType, useEffect, useState } from "react";
import useSWR from "swr";
import { AnimatedSizeContainer } from "../animated-size-container";
import { navItems, type NavTheme } from "./nav";

export function NavMobile({ theme = "light" }: { theme?: NavTheme }) {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const [open, setOpen] = useState(false);
  // prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const { data: session } = useSWR(
    domain === "dub.co" && "/api/auth/session",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return (
    <div className={cn(theme === "dark" && "dark")}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed right-3 top-3 z-40 rounded-full p-2 transition-colors duration-200 hover:bg-gray-200 focus:outline-none active:bg-gray-300 dark:hover:bg-white/20 dark:active:bg-white/30 lg:hidden",
          open && "hover:bg-gray-100 active:bg-gray-200",
        )}
      >
        {open ? (
          <X className="h-5 w-5 text-gray-600 dark:text-white/70" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600 dark:text-white/70" />
        )}
      </button>
      <nav
        className={cn(
          "fixed inset-0 z-20 hidden w-full bg-white px-5 py-16 dark:bg-black dark:text-white/70 lg:hidden",
          open && "block",
        )}
      >
        <ul className="grid divide-y divide-gray-200 dark:divide-white/[0.15]">
          {navItems.map(({ name, href, childItems }, idx) => (
            <MobileNavItem
              key={idx}
              name={name}
              href={href}
              childItems={childItems}
              setOpen={setOpen}
            />
          ))}

          {session && Object.keys(session).length > 0 ? (
            <li className="py-3">
              <Link
                href={APP_DOMAIN}
                className="flex w-full font-semibold capitalize"
              >
                Dashboard
              </Link>
            </li>
          ) : (
            <>
              <li className="py-3">
                <Link
                  href={`${APP_DOMAIN}/login`}
                  className="flex w-full font-semibold capitalize"
                >
                  Log in
                </Link>
              </li>

              <li className="py-3">
                <Link
                  href={`${APP_DOMAIN}/register`}
                  className="flex w-full font-semibold capitalize"
                >
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}

const MobileNavItem = ({
  name,
  href,
  childItems,
  setOpen,
}: {
  name: string;
  href?: string;
  childItems?: {
    title: string;
    href: string;
    icon: ElementType;
    iconClassName?: string;
  }[];
  setOpen: (open: boolean) => void;
}) => {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const [expanded, setExpanded] = useState(false);

  if (childItems) {
    return (
      <li className="py-3">
        <AnimatedSizeContainer height>
          <button
            className="flex w-full justify-between"
            onClick={() => setExpanded(!expanded)}
          >
            <p className="font-semibold">{name}</p>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-gray-500 transition-all dark:text-white/50",
                expanded && "rotate-180",
              )}
            />
          </button>
          {expanded && (
            <div className="grid gap-4 overflow-hidden py-4">
              {childItems.map(({ title, href, icon: Icon, iconClassName }) => (
                <Link
                  key={href}
                  href={
                    domain === "dub.co" ? `/${href}` : `https://dub.co/${href}`
                  }
                  onClick={() => setOpen(false)}
                  className="flex w-full space-x-2"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 text-gray-500 dark:text-white/80",
                      iconClassName,
                    )}
                  />
                  <span className="text-sm">{title}</span>
                </Link>
              ))}
            </div>
          )}
        </AnimatedSizeContainer>
      </li>
    );
  }

  return (
    <li className="py-3">
      <Link
        href={domain === "dub.co" ? `/${href}` : `https://dub.co/${href}`}
        onClick={() => setOpen(false)}
        className="flex w-full font-semibold capitalize"
      >
        {name}
      </Link>
    </li>
  );
};
