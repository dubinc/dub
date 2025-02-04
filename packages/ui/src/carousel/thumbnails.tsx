import { cn } from "@dub/utils";
import useEmblaCarousel from "embla-carousel-react";
import {
  ButtonHTMLAttributes,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useEffect,
} from "react";
import { CarouselApi, useCarousel, useCarouselActiveIndex } from "./carousel";

export const CarouselThumbnails = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => {
  const { api: mainApi } = useCarousel();
  const [thumbnailsRef, thumbnailsApi] = useEmblaCarousel({
    dragFree: true,
  });

  const onSelect = useCallback(
    (api: CarouselApi) => {
      if (!api || !thumbnailsApi) return;

      thumbnailsApi?.scrollTo(api.selectedScrollSnap());
    },
    [thumbnailsApi],
  );

  useEffect(() => {
    if (!mainApi || !thumbnailsApi) return;

    onSelect(mainApi);

    mainApi.on("reInit", onSelect);
    mainApi.on("select", onSelect);

    return () => {
      mainApi?.off("reInit", onSelect);
      mainApi?.off("select", onSelect);
    };
  }, [mainApi, thumbnailsApi, onSelect]);

  return (
    <div className="overflow-hidden" ref={thumbnailsRef}>
      <div className={cn("mx-4 flex gap-4", className)} {...rest} />
    </div>
  );
};

type CarouselThumbnailProps = {
  index: number;
  className?: string | ((d: { active: boolean }) => string);
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export const CarouselThumbnail = forwardRef<
  HTMLDivElement,
  CarouselThumbnailProps
>(({ index, className, ...rest }: CarouselThumbnailProps, ref) => {
  const { api: mainApi } = useCarousel();

  const activeIndex = useCarouselActiveIndex();

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (!mainApi) return;
          const autoplay = mainApi.plugins()?.autoplay;
          if (autoplay && autoplay.isPlaying()) autoplay.stop();

          mainApi.scrollTo(index);
        }}
        className={
          typeof className === "function"
            ? className({ active: index === activeIndex })
            : className
        }
        {...rest}
      />
    </div>
  );
});
