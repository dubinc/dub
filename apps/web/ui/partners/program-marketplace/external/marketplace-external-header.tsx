"use client";

import { Button, Wordmark } from "@dub/ui";
import { APP_DOMAIN, PARTNERS_DOMAIN, cn } from "@dub/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMarketplaceHref } from "../get-marketplace-href";
import { MARKETPLACE_RESERVED_SLUGS } from "../utils/category-slug";

const DUB_HOME_HREF = "https://dub.co/home";

function getPartnersLoginHref(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments[0] === "marketplace" &&
    segments.length === 2 &&
    !MARKETPLACE_RESERVED_SLUGS.has(segments[1])
  ) {
    return `${PARTNERS_DOMAIN}/login?next=${encodeURIComponent(`/marketplace/${segments[1]}`)}`;
  }

  return `${PARTNERS_DOMAIN}/login`;
}

export function MarketplaceExternalHeader() {
  const pathname = usePathname();
  const loginHref = getPartnersLoginHref(pathname);

  return (
    <header className="bg-white">
      <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            className="font-medium text-neutral-500 transition-opacity hover:opacity-80"
          >
            Programs
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={loginHref}
            className="text-content-default hover:text-content-emphasis px-2 py-1 text-sm font-medium transition-colors"
          >
            Log in
          </Link>
          <Link href={`${APP_DOMAIN}/register`}>
            <Button
              text="Sign up"
              className="h-8 w-fit rounded-lg px-3 text-sm font-medium"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketplaceExternalFooter() {
  return (
    <footer className={cn("border-border-subtle border-t bg-white py-10")}>
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <Wordmark className="h-5 opacity-40" />
      </div>
    </footer>
  );
}
