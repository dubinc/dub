"use client";

import { Button, useScroll, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { Program } from "@prisma/client";
import Link from "next/link";

export function Header({
  program,
  slug,
  showButtons = true,
}: {
  program: Pick<Program, "wordmark" | "logo">;
  slug: string;
  showButtons?: boolean;
}) {
  const scrolled = useScroll(0);

  return (
    <header
      className={
        "sticky top-0 mx-px flex items-center justify-between bg-white/90 px-6 py-4 backdrop-blur-sm"
      }
    >
      {/* Bottom border when scrolled */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-px bg-neutral-200 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(90deg,transparent,black,transparent)]",
          scrolled && "opacity-100",
        )}
      />

      <Link href={`/apply/${slug}`}>
        {program.wordmark || program.logo ? (
          <img
            className="h-7 max-w-32"
            src={(program.wordmark ?? program.logo) as string}
          />
        ) : (
          <Wordmark className="h-7" />
        )}
      </Link>

      {showButtons && (
        <Button
          type="button"
          text="Apply"
          className="h-8 w-fit border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
        />
      )}
    </header>
  );
}
