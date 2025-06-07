"use client";

import { Program } from "@dub/prisma/client";
import { Button, useScroll, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header({
  program,
  showLogin = true,
  showApply = true,
}: {
  program: Pick<Program, "slug" | "wordmark" | "logo">;
  showLogin?: boolean;
  showApply?: boolean;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const scrolled = useScroll(0);

  return (
    <header
      className={
        "sticky top-0 z-10 mx-px flex items-center justify-between bg-white/90 px-6 py-4 backdrop-blur-sm"
      }
    >
      {/* Bottom border when scrolled */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-px bg-neutral-200 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(90deg,transparent,black,transparent)]",
          scrolled && "opacity-100",
        )}
      />

      <Link href={`/${program.slug}`} className="animate-fade-in my-0.5 block">
        {program.wordmark || program.logo ? (
          <img
            className="max-h-7 max-w-32"
            src={(program.wordmark ?? program.logo) as string}
          />
        ) : (
          <Wordmark className="h-7" />
        )}
      </Link>

      <div className="flex items-center gap-2">
        {showLogin && !session?.user && status !== "loading" && (
          <Link href={`/${program.slug}/login?next=${pathname}`}>
            <Button
              type="button"
              variant="secondary"
              text="Log in"
              className="animate-fade-in h-8 w-fit text-neutral-600"
            />
          </Link>
        )}
        {showApply && (
          <Link href={`/${program.slug}/apply`}>
            <Button
              type="button"
              text="Apply"
              className="animate-fade-in h-8 w-fit border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
            />
          </Link>
        )}
      </div>
    </header>
  );
}
