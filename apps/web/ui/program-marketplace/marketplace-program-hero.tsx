"use client";

import { NetworkProgramExtendedProps } from "@/lib/types";
import { marketplaceProgramDetailsColumnClassName } from "@/ui/program-marketplace/marketplace-program-details-layout";
import { ProgramCategory } from "@/ui/program-marketplace/program-category";
import { getMarketplaceCategoryHref } from "@/ui/program-marketplace/utils/urls";
import { Globe } from "@dub/ui/icons";
import { OG_AVATAR_URL, cn, getDomainWithoutWWW } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";
import { useImageAccentColor } from "./use-image-accent-color";

export function MarketplaceProgramHero({
  program,
  applySlot,
  className,
}: {
  program: NetworkProgramExtendedProps;
  applySlot?: ReactNode;
  className?: string;
}) {
  const hasBanner = Boolean(program.marketplaceHeaderImage);

  const { color: accentColor, ready: accentReady } = useImageAccentColor(
    hasBanner ? program.marketplaceHeaderImage : null,
  );

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl p-2",
        hasBanner && applySlot && "min-h-[640px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          backgroundColor: hasBanner ? accentColor ?? "#f5f5f5" : "#f5f5f5",
          opacity: hasBanner ? (accentReady ? 1 : 0) : 1,
        }}
      />

      {hasBanner && program.marketplaceHeaderImage && (
        <div className="relative z-10 h-[307px] w-full shrink-0 overflow-hidden rounded-xl">
          <img
            src={program.marketplaceHeaderImage}
            alt={program.name}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      )}

      <div
        className={cn(
          marketplaceProgramDetailsColumnClassName,
          "relative z-20 p-4",
        )}
      >
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className={cn(
            "size-16 rounded-full border border-black/5",
            hasBanner && "-mt-8 border-4 border-neutral-100",
          )}
        />

        <div className="mt-6 flex flex-col">
          <h1 className="text-content-emphasis text-3xl font-semibold">
            {program.name}
          </h1>

          <p className="text-content-default mt-2 max-w-md text-sm">
            {program.description ||
              `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-12 gap-y-4">
          {Boolean(program.categories?.length) && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium leading-none text-neutral-400">
                Category
              </span>
              <div className="flex min-h-7 flex-wrap items-center gap-1.5">
                {program.categories.map((category) => (
                  <ProgramCategory
                    key={category}
                    category={category}
                    variant="surface"
                    href={getMarketplaceCategoryHref(category)}
                  />
                ))}
              </div>
            </div>
          )}

          {program.url && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium leading-none text-neutral-400">
                Website
              </span>
              <Link
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-content-default hover:text-content-emphasis flex h-7 max-w-[220px] items-center gap-1.5 text-sm font-medium leading-none"
              >
                <Globe className="size-4 shrink-0" />
                <span className="truncate">
                  {getDomainWithoutWWW(program.url)} ↗
                </span>
              </Link>
            </div>
          )}
        </div>

        {applySlot ? <div className="mt-8 w-fit">{applySlot}</div> : null}
      </div>
    </div>
  );
}
