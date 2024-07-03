"use client";

import { APP_DOMAIN, cn, fetcher } from "@dub/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { type NavTheme } from "./nav";

const navItems = [
  {
    name: "Product",
    href: "/",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Help Center",
    href: "/help",
  },
  {
    name: "Docs",
    href: "/docs",
  },
  {
    name: "Blog",
    href: "/blog",
  },
  {
    name: "Changelog",
    href: "/changelog",
  },
  {
    name: "Customers",
    href: "/customers",
  },
  {
    name: "Brand",
    href: "/brand",
  },
];

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
          open && "animate-fade-in block",
        )}
      >
        <ul className="grid grid-cols-2">
          {navItems.map(({ name, href }, idx) => (
            <li key={href} className="py-3">
              <Link
                href={domain === "dub.co" ? href : `https://dub.co${href}`}
                onClick={() => setOpen(false)}
                className="flex w-full text-lg font-medium capitalize"
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
