"use client";

import {
  ClientOnly,
  MaxWidthWrapper,
  NavWordmark,
  Popover,
  useMediaQuery,
} from "@dub/ui";
import Link from "next/link";
import { useState } from "react";

const tabs = [
  {
    href: "/links",
    label: "Links",
  },
  {
    href: "/analytics",
    label: "Analytics",
  },
  {
    href: "/commissions",
    label: "Commissions",
  },
  {
    href: "/payouts",
    label: "Payouts",
  },
  {
    href: "/revenue",
    label: "Revenue",
  },
];

export function AdminNav() {
  const [openPopover, setOpenPopover] = useState(false);
  const { isMobile } = useMediaQuery();

  const NavContent = () => (
    <div className="flex w-full flex-col gap-1 p-2">
      {tabs.map((tab) => (
        <Link
          href={tab.href}
          key={tab.href}
          className="block w-full rounded-md px-4 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
          onClick={() => setOpenPopover(false)}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="sticky left-0 right-0 top-0 z-20 border-b border-neutral-200 bg-white">
      <MaxWidthWrapper>
        <div className="flex h-16 w-full items-center justify-between sm:justify-start sm:gap-12">
          <Link href="/">
            <NavWordmark className="h-6" />
          </Link>
          <ClientOnly>
            {isMobile ? (
              <div className="ml-auto">
                <Popover
                  content={<NavContent />}
                  openPopover={openPopover}
                  setOpenPopover={setOpenPopover}
                  mobileOnly
                >
                  <button className="text-neutral-500">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                </Popover>
              </div>
            ) : (
              <div className="flex items-center gap-12">
                {tabs.map((tab) => (
                  <Link
                    href={tab.href}
                    key={tab.href}
                    className="text-sm text-neutral-500"
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            )}
          </ClientOnly>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
