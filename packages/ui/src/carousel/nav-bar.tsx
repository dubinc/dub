import { cn } from "@dub/utils";
import { VariantProps, cva } from "class-variance-authority";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";
import { AUTOPLAY_DEFAULT_DELAY, CarouselApi, useCarousel } from "./carousel";

const CarouselNavBarVariants = cva(
  "flex items-center justify-center gap-3 sm:gap-6",
  {
    variants: {
      variant: {
        simple: "relative",
        floating:
          "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-neutral-800/10 bg-white sm:bottom-6 ",
      },
    },
  },
);

export const CarouselNavBar = ({
  variant = "simple",
  className,
  count,
}: VariantProps<typeof CarouselNavBarVariants> & {
  className?: string;
  count?: number;
}) => {
  const {
    scrollNext,
    scrollPrev,
    canScrollNext,
    canScrollPrev,
    api,
    autoplay: autoplayConfig,
  } = useCarousel();

  const autoplayPlugin = api?.plugins()?.autoplay;
  const showAutoplayTrack = Boolean(autoplayConfig);

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [isPlaying, setIsPlaying] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    setSelectedIndex(api?.selectedScrollSnap() ?? 0);
  }, []);

  const stopAutoplayAnd = React.useCallback(
    (fn: () => void) => () => {
      if (autoplayPlugin && autoplayPlugin.isPlaying()) autoplayPlugin.stop();
      fn();
    },
    [autoplayPlugin],
  );

  React.useEffect(() => {
    if (!api) return;

    onSelect(api);
    setIsPlaying(autoplayPlugin?.isPlaying() ?? false);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    api.on("autoplay:play", () => setIsPlaying(true));
    api.on("autoplay:stop", () => setIsPlaying(false));
  }, [api, autoplayPlugin, onSelect]);

  const slideCount = count ?? api?.slideNodes().length ?? 0;

  return (
    <div className={cn(CarouselNavBarVariants({ variant }), className)}>
      {variant !== "simple" && (
        <button
          className="cursor-pointer rounded-full p-2 hover:bg-neutral-50 active:bg-neutral-100"
          disabled={!canScrollPrev}
          onClick={stopAutoplayAnd(scrollPrev)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous slide</span>
        </button>
      )}

      {slideCount > 0 && (
        <div className="flex min-h-2.5 items-center gap-1 sm:min-h-[18px]">
          {Array.from({ length: slideCount }).map((_, idx) => (
            <button
              key={idx}
              onClick={
                api ? stopAutoplayAnd(() => api.scrollTo(idx)) : undefined
              }
              className="flex items-center justify-center rounded-full p-0.5 leading-none hover:bg-neutral-100 active:bg-neutral-200 sm:p-1.5"
            >
              <div
                className={cn(
                  "relative isolate h-1.5 w-1.5 overflow-hidden rounded-full",
                  idx === selectedIndex ? "bg-black" : "bg-black/20",
                  showAutoplayTrack &&
                    idx === selectedIndex &&
                    "w-6 bg-black/20",
                )}
              >
                {isPlaying && idx === selectedIndex && (
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    transition={{
                      type: "tween",
                      duration:
                        ((autoplayPlugin?.options.delay ??
                          AUTOPLAY_DEFAULT_DELAY) as number) / 1000,
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
          className="cursor-pointer rounded-full p-2 hover:bg-neutral-50 active:bg-neutral-100"
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
