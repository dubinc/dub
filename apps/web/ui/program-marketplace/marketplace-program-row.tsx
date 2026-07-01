"use client";

import { NetworkProgramProps } from "@/lib/types";
import { Carousel, CarouselContent, CarouselItem, useCarousel } from "@dub/ui";
import { ChevronLeft, ChevronRight } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import useSWR from "swr";
import { MarketplaceViewAllCard } from "./marketplace-view-all-card";
import {
  MarketplaceProgramCard,
  MarketplaceProgramCardSkeleton,
} from "./program-card";

type MarketplaceProgramRowProps = {
  title: string;
  viewAllHref: string;
  showViewAllCard?: boolean;
  showStatus?: boolean;
  variant?: "default" | "home";
  programs?: NetworkProgramProps[];
  apiPath?: string;
};

const marketplaceCarouselNavButtonClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-800 transition-colors hover:bg-neutral-900/5 disabled:pointer-events-none disabled:opacity-40";

function MarketplaceCarouselNav() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous slide"
        className={marketplaceCarouselNavButtonClassName}
      >
        <ChevronLeft className="size-3" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next slide"
        className={marketplaceCarouselNavButtonClassName}
      >
        <ChevronRight className="size-3" />
      </button>
    </div>
  );
}

export function MarketplaceProgramRow({
  title,
  viewAllHref,
  showViewAllCard = false,
  showStatus = true,
  variant = "default",
  ...props
}: MarketplaceProgramRowProps) {
  const { data: fetchedPrograms, error } = useSWR<NetworkProgramProps[]>(
    props.apiPath ?? null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const programs = props.programs ?? fetchedPrograms;
  const isHome = variant === "home";

  const carouselItemClassName = cn(
    "pl-0",
    isHome
      ? "basis-[310px] sm:basis-[419px]"
      : "basis-[280px] md:basis-[320px]",
  );

  const cardClassName = isHome
    ? "h-[260px] w-[310px] sm:h-[284px] sm:w-[419px] sm:p-8"
    : undefined;

  if (error || programs?.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Carousel opts={{ align: "start", dragFree: true }}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-content-emphasis text-[18px] font-semibold">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={viewAllHref}
              className="text-content-emphasis text-sm font-medium transition-colors hover:text-neutral-500"
            >
              View all
            </Link>

            <MarketplaceCarouselNav />
          </div>
        </div>

        <CarouselContent className="-ml-0 mt-4 gap-4">
          {programs ? (
            <>
              {programs.map((program) => (
                <CarouselItem
                  key={program.id}
                  className={carouselItemClassName}
                >
                  <MarketplaceProgramCard
                    program={program}
                    showStatus={showStatus}
                    className={cardClassName}
                  />
                </CarouselItem>
              ))}
              {showViewAllCard ? (
                <CarouselItem className={carouselItemClassName}>
                  <MarketplaceViewAllCard
                    href={viewAllHref}
                    className={cardClassName}
                  />
                </CarouselItem>
              ) : null}
            </>
          ) : (
            [...Array(3)].map((_, idx) => (
              <CarouselItem key={idx} className={carouselItemClassName}>
                <MarketplaceProgramCardSkeleton className={cardClassName} />
              </CarouselItem>
            ))
          )}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
