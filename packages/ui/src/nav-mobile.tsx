"use client";

import { APP_DOMAIN, cn, fetcher } from "@dub/utils";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { FEATURES_LIST } from "./content";
import { navItems } from "./nav";

export function NavMobile(): JSX.Element {
  const { domain = "dub.co" } = useParams();
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
    <>
      <button
        className={cn(
          "fixed right-3 top-3 z-40 rounded-full p-2 transition-colors duration-200 hover:bg-gray-200 focus:outline-none active:bg-gray-300 lg:hidden",
          open && "hover:bg-gray-100 active:bg-gray-200",
        )}
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
      >
        {open ? (
          <X className="h-5 w-5 text-gray-600" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600" />
        )}
      </button>
      <nav
        className={cn(
          "fixed inset-0 z-20 hidden w-full bg-white px-5 py-16 lg:hidden",
          open && "block",
        )}
      >
        <ul className="grid divide-y divide-gray-200">
          <li className="py-3">
            <button
              className="flex w-full justify-between"
              onClick={() => {
                setOpenFeatures(!openFeatures);
              }}
              type="button"
            >
              <p className="font-semibold">Features</p>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-gray-500 transition-all",
                  openFeatures && "rotate-180",
                )}
              />
            </button>
            {openFeatures ? (
              <div className="grid gap-4 overflow-hidden py-4">
                {FEATURES_LIST.map(({ slug, icon: Icon, shortTitle }) => (
                  <Link
                    className="flex w-full space-x-2"
                    href={
                      domain === "dub.co"
                        ? `/${slug}`
                        : `https://dub.co/${slug}`
                    }
                    key={slug}
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm">{shortTitle}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </li>
          {navItems.map(({ name, slug }) => (
            <li className="py-3" key={slug}>
              <Link
                className="flex w-full font-semibold capitalize"
                href={
                  domain === "dub.co" ? `/${slug}` : `https://dub.co/${slug}`
                }
                onClick={() => {
                  setOpen(false);
                }}
              >
                {name}
              </Link>
            </li>
          ))}

          {session && Object.keys(session).length > 0 ? (
            <li className="py-3">
              <Link
                className="flex w-full font-semibold capitalize"
                href={APP_DOMAIN}
              >
                Dashboard
              </Link>
            </li>
          ) : (
            <>
              <li className="py-3">
                <Link
                  className="flex w-full font-semibold capitalize"
                  href={`${APP_DOMAIN}/login`}
                >
                  Log in
                </Link>
              </li>

              <li className="py-3">
                <Link
                  className="flex w-full font-semibold capitalize"
                  href={`${APP_DOMAIN}/register`}
                >
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </>
  );
}
