"use client";

import { NetworkProgramProps } from "@/lib/types";
import { Carousel, CarouselContent, CarouselItem, useCarousel } from "@dub/ui";
import { ChevronLeft, ChevronRight } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
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
} & (
  | { programs: NetworkProgramProps[]; apiPath?: never }
  | { apiPath: string; programs?: never }
);

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
  ...props
}: MarketplaceProgramRowProps) {
  const { data: fetchedPrograms, error } = useSWR<NetworkProgramProps[]>(
    "apiPath" in props && props.apiPath ? props.apiPath : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const programs = "programs" in props ? props.programs : fetchedPrograms;

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

        <CarouselContent className="-ml-4 mt-4 items-stretch">
          {programs ? (
            <>
              {programs.map((program) => (
                <CarouselItem
                  key={program.id}
                  className="basis-[280px] pl-4 md:basis-[320px]"
                >
                  <MarketplaceProgramCard
                    program={program}
                    showStatus={showStatus}
                  />
                </CarouselItem>
              ))}
              {showViewAllCard ? (
                <CarouselItem className="basis-[280px] pl-4 md:basis-[320px]">
                  <MarketplaceViewAllCard href={viewAllHref} />
                </CarouselItem>
              ) : null}
            </>
          ) : (
            [...Array(3)].map((_, idx) => (
              <CarouselItem
                key={idx}
                className="basis-[280px] pl-4 md:basis-[320px]"
              >
                <MarketplaceProgramCardSkeleton />
              </CarouselItem>
            ))
          )}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
