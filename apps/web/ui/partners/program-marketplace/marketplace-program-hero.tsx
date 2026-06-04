import { NetworkProgramExtendedProps } from "@/lib/types";
import { marketplaceProgramDetailsColumnClassName } from "@/ui/partners/program-marketplace/marketplace-program-details-layout";
import { ProgramCategory } from "@/ui/partners/program-marketplace/program-category";
import { Globe } from "@dub/ui/icons";
import { OG_AVATAR_URL, cn, getDomainWithoutWWW } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

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
  const isDarkImage = program.marketplaceHeaderImage?.includes("dark");

  return (
    <div
      className={cn(
        "border-border-subtle relative overflow-hidden rounded-xl border bg-neutral-100",
        className,
      )}
    >
      {hasBanner && program.marketplaceHeaderImage && (
        <div className="relative h-48 w-full sm:h-56">
          <img
            src={program.marketplaceHeaderImage}
            alt={program.name}
            className="size-full object-cover"
          />
          {!isDarkImage && (
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/75 to-transparent" />
          )}
        </div>
      )}

      <div
        className={cn(
          marketplaceProgramDetailsColumnClassName,
          "relative pb-8",
          hasBanner ? "pt-0" : "pt-8",
        )}
      >
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          alt={program.name}
          className={cn(
            "size-16 rounded-full border border-white/20",
            hasBanner && "-mt-8",
          )}
        />

        <div className="mt-6 flex flex-col">
          <span
            className={cn(
              "text-3xl font-semibold",
              hasBanner && isDarkImage && "text-content-inverted",
            )}
          >
            {program.name}
          </span>

          <p
            className={cn(
              "mt-2 max-w-md text-sm",
              hasBanner && isDarkImage
                ? "text-content-inverted/90"
                : "text-content-default",
            )}
          >
            {program.description ||
              `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-12 gap-y-4">
          {Boolean(program.categories?.length) && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span
                className={cn(
                  "text-xs font-medium leading-none",
                  hasBanner && isDarkImage
                    ? "text-content-inverted/80"
                    : "text-neutral-400",
                )}
              >
                Category
              </span>
              <div className="flex min-h-7 flex-wrap items-center gap-1.5">
                {program.categories.map((category) => (
                  <ProgramCategory
                    key={category}
                    category={category}
                    variant="pill"
                    className={cn(
                      hasBanner &&
                        isDarkImage &&
                        "text-content-inverted [&_svg]:text-content-inverted/80 bg-white/15 hover:bg-white/20 active:bg-white/25",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {program.url && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span
                className={cn(
                  "text-xs font-medium leading-none",
                  hasBanner && isDarkImage
                    ? "text-content-inverted/80"
                    : "text-neutral-400",
                )}
              >
                Website
              </span>
              <Link
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex h-7 max-w-[220px] items-center gap-1.5 text-sm font-medium leading-none",
                  hasBanner && isDarkImage
                    ? "text-content-inverted/90 hover:text-content-inverted"
                    : "text-content-default hover:text-content-emphasis",
                )}
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
