"use client";

import { Button, useScroll, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

export function BrowseHeader() {
  const { data: session, status } = useSession();

  const scrolled = useScroll(0);

  return (
    <header
      className={cn(
        "sticky top-0 z-10 mx-px flex items-center justify-between bg-white/90 px-6 py-4 backdrop-blur-sm",
      )}
    >
      {/* Bottom border when scrolled */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-px bg-neutral-200 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(90deg,transparent,black,transparent)]",
          scrolled && "opacity-100",
        )}
      />

      <Link href="/browse" className="animate-fade-in my-0.5 block">
        <Wordmark className="h-7" />
      </Link>

      <div className="flex items-center gap-2">
        {!session?.user && status !== "loading" && (
          <Link href="/login?next=/browse">
            <span className="animate-fade-in h-8 w-fit px-4 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-50">
              Log in
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}

