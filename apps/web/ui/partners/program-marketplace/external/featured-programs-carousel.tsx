"use client";

import { NetworkProgramProps } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
} from "@dub/ui";
import {
  FeaturedProgramCard,
  FeaturedProgramCardSkeleton,
} from "../featured-program-card";

export function FeaturedProgramsCarousel({
  programs,
}: {
  programs: NetworkProgramProps[];
}) {
  if (programs.length === 0) {
    return null;
  }

  return (
    <div>
      <Carousel autoplay={{ delay: 5000 }} opts={{ loop: true }}>
        <CarouselContent className="items-stretch">
          {programs.map((program) => (
            <CarouselCard key={program.id} program={program} showStatus={false} />
          ))}
        </CarouselContent>
        <div className="mt-2">
          <CarouselNavBar />
        </div>
      </Carousel>
    </div>
  );
}

export function FeaturedProgramsCarouselSkeleton() {
  return (
    <div>
      <Carousel opts={{ loop: true }}>
        <CarouselContent className="items-stretch">
          <CarouselItem className="basis-full">
            <FeaturedProgramCardSkeleton />
          </CarouselItem>
          <CarouselItem className="basis-full">
            <FeaturedProgramCardSkeleton />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>
  );
}

const CarouselCard = ({
  program,
  showStatus = false,
}: {
  program: NetworkProgramProps;
  showStatus?: boolean;
}) => {
  return (
    <CarouselItem className="basis-full">
      <FeaturedProgramCard program={program} showStatus={showStatus} />
    </CarouselItem>
  );
};
