"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import {
  FeaturedProgramCard,
  FeaturedProgramCardSkeleton,
} from "./featured-program-card";

const FEATURED_PROGRAMS_API_PATH = "/api/network/programs?featured=true";

type FeaturedProgramsProps = {
  showStatus?: boolean;
} & (
  | { programs: NetworkProgramProps[]; apiPath?: never }
  | { apiPath?: string; programs?: never }
);

export function FeaturedPrograms({
  showStatus = true,
  ...props
}: FeaturedProgramsProps) {
  const apiPath =
    "apiPath" in props && props.apiPath !== undefined
      ? props.apiPath
      : "programs" in props
        ? null
        : FEATURED_PROGRAMS_API_PATH;

  const { data: fetchedPrograms, error } = useSWR<NetworkProgramProps[]>(
    apiPath,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const programs = "programs" in props ? props.programs : fetchedPrograms;

  if (error || programs?.length === 0) {
    return null;
  }

  return (
    <div>
      <Carousel autoplay={{ delay: 5000 }} opts={{ loop: true }}>
        <CarouselContent className="items-stretch">
          {programs ? (
            programs.map((program, index) => (
              <CarouselItem key={program.id} className="basis-full">
                <FeaturedProgramCard
                  program={program}
                  showStatus={showStatus}
                  colorIndex={index}
                />
              </CarouselItem>
            ))
          ) : (
            <FeaturedProgramsSkeletonItems />
          )}
        </CarouselContent>
        <div className="mt-2">
          <CarouselNavBar />
        </div>
      </Carousel>
    </div>
  );
}

export function FeaturedProgramsSkeleton() {
  return (
    <div>
      <Carousel opts={{ loop: true }}>
        <CarouselContent className="items-stretch">
          <FeaturedProgramsSkeletonItems />
        </CarouselContent>
      </Carousel>
    </div>
  );
}

function FeaturedProgramsSkeletonItems() {
  return (
    <>
      <CarouselItem className="basis-full">
        <FeaturedProgramCardSkeleton />
      </CarouselItem>
      <CarouselItem className="basis-full">
        <FeaturedProgramCardSkeleton />
      </CarouselItem>
    </>
  );
}
