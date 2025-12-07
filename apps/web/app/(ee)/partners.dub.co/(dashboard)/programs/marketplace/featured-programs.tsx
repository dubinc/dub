"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ComponentProps } from "react";
import useSWR from "swr";
import { FeaturedProgramCard } from "./featured-program-card";

export function FeaturedPrograms() {
  const { data: programs, error } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs?featured=true`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return programs?.length === 0 || error ? null : (
    <div>
      <h2 className="text-content-emphasis text-base font-semibold">
        Featured programs
      </h2>
      <div className="mt-4">
        <Carousel autoplay={{ delay: 5000 }} opts={{ loop: true }}>
          <CarouselContent className="items-stretch">
            {programs ? (
              programs.map((program) => (
                <CarouselCard key={program.id} program={program} />
              ))
            ) : (
              <>
                <CarouselCard />
                <CarouselCard />
              </>
            )}
          </CarouselContent>
          <div className="mt-2">
            <CarouselNavBar />
          </div>
        </Carousel>
      </div>
    </div>
  );
}

const CarouselCard = (props: ComponentProps<typeof FeaturedProgramCard>) => {
  return (
    <CarouselItem className="basis-full">
      <FeaturedProgramCard {...props} />
    </CarouselItem>
  );
};
