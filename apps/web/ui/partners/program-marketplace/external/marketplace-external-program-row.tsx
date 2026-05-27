"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@dub/ui";
import Link from "next/link";
import { MarketplaceViewAllCard } from "../marketplace-view-all-card";
import { MarketplaceProgramCard } from "../program-card";

export function MarketplaceExternalProgramRow({
  title,
  viewAllHref,
  programs,
  showViewAllCard = false,
}: {
  title: string;
  viewAllHref: string;
  programs: NetworkProgramProps[];
  showViewAllCard?: boolean;
}) {
  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Carousel opts={{ align: "start", dragFree: true }}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-content-emphasis text-base font-semibold">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={viewAllHref}
              className="text-content-subtle hover:text-content-emphasis text-sm font-medium transition-colors"
            >
              View all
            </Link>
            <CarouselPrevious className="static left-auto top-auto -translate-y-0" />
            <CarouselNext className="static right-auto top-auto -translate-y-0" />
          </div>
        </div>

        <CarouselContent className="-ml-4 mt-4 items-stretch">
          {programs.map((program) => (
            <CarouselItem
              key={program.id}
              className="basis-[280px] pl-4 md:basis-[320px]"
            >
              <MarketplaceProgramCard program={program} showStatus={false} />
            </CarouselItem>
          ))}
          {showViewAllCard ? (
            <CarouselItem className="basis-[280px] pl-4 md:basis-[320px]">
              <MarketplaceViewAllCard href={viewAllHref} />
            </CarouselItem>
          ) : null}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
