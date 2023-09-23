"use client";

import { APP_DOMAIN } from "#/lib/constants";
import Link from "next/link";
import { useParams } from "next/navigation";
import { navItems } from "./nav";
import { useSession } from "next-auth/react";
import { FEATURES_LIST } from "#/lib/constants/content";
import { cn } from "#/lib/utils";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

export default function MobileNav() {
  const { domain = "dub.co" } = useParams() as { domain: string };
  const { data: session, status } = useSession() || {
    status: "unauthenticated", // if `useSession` is undefined, we're on a non dub.co domain
  };
  const [open, setOpen] = useState(false);
  const [openFeatures, setOpenFeatures] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute right-3 top-3 z-40 rounded-full p-2 transition-colors duration-200 hover:bg-gray-200 focus:outline-none active:bg-gray-300 lg:hidden",
          open && "hover:bg-gray-100 active:bg-gray-200",
        )}
      >
        {open ? (
          <X className="h-5 w-5 text-gray-600" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600" />
        )}
      </button>
      <nav
        className={cn(
          "fixed inset-0 z-20 hidden w-full bg-white px-5 py-16",
          open && "block",
        )}
      >
        <ul className="grid divide-y divide-gray-200">
          <li className="py-3">
            <button
              className="flex w-full justify-between"
              onClick={() => setOpenFeatures(!openFeatures)}
            >
              <p className="font-semibold">Features</p>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-500 transition-all",
                  openFeatures && "rotate-180",
                )}
              />
            </button>
            {openFeatures && (
              <div className="grid gap-4 overflow-hidden py-4">
                {FEATURES_LIST.map((feature) => (
                  <Link
                    key={feature.slug}
                    href={
                      domain === "dub.co"
                        ? `/features/${feature.slug}`
                        : `https://dub.co/features/${feature.slug}?utm_source=${domain}&utm_medium=referral&utm_campaign=custom-domain`
                    }
                    onClick={() => setOpen(false)}
                    className="flex w-full space-x-2"
                  >
                    <feature.icon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">{feature.shortTitle}</span>
                  </Link>
                ))}
              </div>
            )}
          </li>
          {navItems.map(({ name, slug }) => (
            <li key={slug} className="py-3">
              <Link
                href={
                  domain === "dub.co"
                    ? `/${slug}`
                    : `https://dub.co/${slug}?utm_source=${domain}&utm_medium=referral&utm_campaign=custom-domain`
                }
                onClick={() => setOpen(false)}
                className="flex w-full font-semibold capitalize"
              >
                {name}
              </Link>
            </li>
          ))}

          {session ? (
            <li className="py-3">
              <Link
                href={APP_DOMAIN}
                className="flex w-full font-semibold capitalize"
              >
                Dashboard
              </Link>
            </li>
          ) : status === "unauthenticated" ? (
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
          ) : null}
        </ul>
      </nav>
    </>
  );
}
