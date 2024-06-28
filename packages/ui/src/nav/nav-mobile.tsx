"use client";

import { APP_DOMAIN, cn, fetcher } from "@dub/utils";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { FEATURES_LIST } from "../content";
import { type NavTheme } from "./nav";

export const navItems = [
  {
    name: "Product",
    href: "/",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
];

export function NavMobile({ theme = "light" }: { theme?: NavTheme }) {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const [open, setOpen] = useState(false);
  const [openFeatures, setOpenFeatures] = useState(false);
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
          "fixed right-3 top-3 z-40 rounded-full p-2 transition-colors duration-200 hover:bg-gray-200 focus:outline-none active:bg-gray-300 lg:hidden dark:hover:bg-white/20 dark:active:bg-white/30",
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
          "fixed inset-0 z-20 hidden w-full bg-white px-5 py-16 lg:hidden dark:bg-black dark:text-white/70",
          open && "block",
        )}
      >
        <ul className="grid divide-y divide-gray-200 dark:divide-white/[0.15]">
          <li className="py-3">
            <button
              className="flex w-full justify-between"
              onClick={() => setOpenFeatures(!openFeatures)}
            >
              <p className="font-semibold">Features</p>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-500 transition-all dark:text-white/50",
                  openFeatures && "rotate-180",
                )}
              />
            </button>
            {openFeatures && (
              <div className="grid gap-4 overflow-hidden py-4">
                {FEATURES_LIST.map(({ slug, icon: Icon, shortTitle }) => (
                  <Link
                    key={slug}
                    href={
                      domain === "dub.co"
                        ? `/${slug}`
                        : `https://dub.co/${slug}`
                    }
                    onClick={() => setOpen(false)}
                    className="flex w-full space-x-2"
                  >
                    <Icon className="h-5 w-5 text-gray-500 dark:text-white/80" />
                    <span className="text-sm">{shortTitle}</span>
                  </Link>
                ))}
              </div>
            )}
          </li>
          {navItems.map(({ name, href }) => (
            <li key={href} className="py-3">
              <Link
                href={domain === "dub.co" ? href : `https://dub.co${href}`}
                onClick={() => setOpen(false)}
                className="flex w-full font-semibold capitalize"
              >
                {name}
              </Link>
            </li>
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
