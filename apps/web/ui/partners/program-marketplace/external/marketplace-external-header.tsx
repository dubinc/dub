import { Button, Wordmark } from "@dub/ui";
import { APP_DOMAIN, PARTNERS_DOMAIN, cn } from "@dub/utils";
import Link from "next/link";

export function MarketplaceExternalHeader() {
  return (
    <header className="border-border-subtle border-b bg-white">
      <div className="mx-auto flex h-16 w-full max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/marketplace"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Wordmark className="h-5" />
          <span className="text-content-subtle text-lg font-light">|</span>
          <span className="text-content-emphasis text-sm font-medium">
            Programs
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`${PARTNERS_DOMAIN}/login`}
            className="text-content-default hover:text-content-emphasis px-3 py-2 text-sm font-medium transition-colors"
          >
            Log in
          </Link>
          <Link href={`${APP_DOMAIN}/register`}>
            <Button
              text="Sign up"
              className="h-9 rounded-lg px-4 text-sm font-medium"
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
