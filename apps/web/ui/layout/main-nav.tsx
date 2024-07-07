"use client";

import { NavLogo, useScroll } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Divider } from "../shared/icons";
import UpgradeBanner from "./upgrade-banner";
import UserDropdown from "./user-dropdown";
import WorkspaceSwitcher from "./workspace-switcher";

export function MainNav() {
  const { slug } = useParams() as { slug?: string };
  const scrolled = useScroll(80);

  return (
    <div className="flex h-16 items-center justify-between">
      <div className="flex items-center">
        <Link
          href={`/${slug || ""}`}
          className={cn(
            "hidden transition-all sm:block",
            scrolled && "translate-y-[3.4rem]",
          )}
        >
          <NavLogo
            variant="symbol"
            isInApp
            {...(scrolled && { className: "h-6 w-6" })}
          />
        </Link>
        <Divider className="hidden h-8 w-8 text-gray-200 sm:ml-3 sm:block" />
        <WorkspaceSwitcher />
      </div>
      <div className="flex items-center space-x-6">
        <UpgradeBanner />
        <a
          href="https://dub.co/help"
          className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 sm:block"
          target="_blank"
        >
          Help
        </a>
        <UserDropdown />
      </div>
    </div>
  );
}
