"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
} from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { ComponentProps } from "react";
import useSWR from "swr";
import { FeaturedProgramCard } from "./program-card";

export function FeaturedPrograms() {
  const { data: programs, error } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs?featured=true`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return programs?.length === 0 ? null : (
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
          <div
            className={cn(
              "mt-2",
              (!programs || programs.length <= 2) && "@2xl/page:hidden",
            )}
          >
            <CarouselNavBar />
          </div>
        </Carousel>
      </div>
    </div>
  );
}

const CarouselCard = (props: ComponentProps<typeof FeaturedProgramCard>) => {
  return (
    <CarouselItem className="@2xl/page:basis-1/2 basis-full">
      <FeaturedProgramCard {...props} />
    </CarouselItem>
  );
};
