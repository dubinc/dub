"use client";

import { NavMobile, Nav as NavUI, Wordmark } from "@dub/ui";
import Link from "next/link";
import { getMarketplaceHref } from "../utils/urls";

const DUB_HOME_HREF = "https://dub.co/home";

function MarketplaceLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <Link
        href={DUB_HOME_HREF}
        className="transition-opacity hover:opacity-80"
      >
        <Wordmark className="h-6" />
      </Link>
      <span className="text-lg font-light text-neutral-300">|</span>
      <Link
        href={getMarketplaceHref()}
        className="text-sm font-medium text-neutral-500 transition-opacity hover:opacity-80"
      >
        Programs
      </Link>
    </div>
  );
}

export function MarketplaceExternalHeader() {
  return (
    <>
      <NavMobile navItems={[]} />
      <NavUI staticDomain="dub.co" navItems={[]} logo={<MarketplaceLogo />} />
    </>
  );
}
