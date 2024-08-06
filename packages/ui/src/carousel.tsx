"use client";

import { cn } from "@dub/utils";
import { VariantProps, cva } from "class-variance-authority";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { buttonVariants } from "./button";

const AUTOPLAY_DEFAULT_DELAY = 2000;

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];
type AutoplayOptions = Parameters<typeof Autoplay>[0];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  autoplay?: boolean | AutoplayOptions;
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      autoplay,
      plugins,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      [
        ...(autoplay
          ? [
              Autoplay(
                typeof autoplay === "object"
                  ? autoplay
                  : {
                      delay: AUTOPLAY_DEFAULT_DELAY,
                    },
              ),
            ]
          : []),
        ...(plugins || []),
      ],
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return;
      }

      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, []);

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext],
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);

      return () => {
        api?.off("select", onSelect);
      };
    }, [api, onSelect]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  { className?: string }
>(({ className, ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        buttonVariants({ variant: "secondary", className: "p-2" }),
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  { className?: string }
>(({ className, ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        buttonVariants({ variant: "secondary", className: "p-2" }),
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </button>
  );
});
CarouselNext.displayName = "CarouselNext";

const CarouselNavBarVariants = cva(
  "flex items-center justify-center gap-3 sm:gap-6",
  {
    variants: {
      variant: {
        simple: "relative",
        floating:
          "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-gray-800/10 bg-white sm:bottom-6 ",
      },
    },
  },
);

const CarouselNavBar = ({
  variant = "simple",
  className,
}: VariantProps<typeof CarouselNavBarVariants> & { className?: string }) => {
  const { scrollNext, scrollPrev, canScrollNext, canScrollPrev, api } =
    useCarousel();

  const autoplay = api?.plugins()?.autoplay;

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [isPlaying, setIsPlaying] = React.useState(false);

  const onSelect = React.useCallback((api: any) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  const stopAutoplayAnd = React.useCallback(
    (fn: any) => () => {
      if (autoplay && autoplay.isPlaying()) autoplay.stop();
      fn();
    },
    [autoplay],
  );

  React.useEffect(() => {
    if (!api) return;

    onSelect(api);
    setIsPlaying(autoplay?.isPlaying() ?? false);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    api.on("autoplay:play", () => setIsPlaying(true));
    api.on("autoplay:stop", () => setIsPlaying(false));
  }, [api, autoplay, onSelect]);

  return (
    <div className={cn(CarouselNavBarVariants({ variant }), className)}>
      {variant !== "simple" && (
        <button
          className="cursor-pointer rounded-full p-2 hover:bg-gray-50 active:bg-gray-100"
          disabled={!canScrollPrev}
          onClick={stopAutoplayAnd(scrollPrev)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous slide</span>
        </button>
      )}

      {api != null && (
        <div className="flex items-center gap-1">
          {api.slideNodes().map((_, idx) => (
            <button
              key={idx}
              onClick={stopAutoplayAnd(() => api.scrollTo(idx))}
              className="rounded-full p-0.5 hover:bg-gray-100 active:bg-gray-200 sm:p-1.5"
            >
              <div
                className={cn(
                  "relative isolate h-1.5 w-1.5 overflow-hidden rounded-full transition-all",
                  idx === selectedIndex ? "bg-black" : "bg-black/20",
                  isPlaying && idx === selectedIndex && "w-6 bg-black/20",
                )}
              >
                {isPlaying && idx === selectedIndex && (
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    transition={{
                      type: "tween",
                      duration:
                        (autoplay?.options.delay ?? AUTOPLAY_DEFAULT_DELAY) /
                        1000,
                    }}
                    className="animate-fill-width h-full w-full rounded-full bg-black"
                  />
                )}
              </div>
              <span className="sr-only">Slide {idx + 1}</span>
            </button>
          ))}
        </div>
      )}

      {variant !== "simple" && (
        <button
          className="cursor-pointer rounded-full p-2 hover:bg-gray-50 active:bg-gray-100"
          disabled={!canScrollNext}
          onClick={stopAutoplayAnd(scrollNext)}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next slide</span>
        </button>
      )}
    </div>
  );
};

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
};
