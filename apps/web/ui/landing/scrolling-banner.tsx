import { cn } from "@dub/utils";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import Image, { StaticImageData } from "next/image";
import React from "react";

interface IScrollingBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  data: StaticImageData[];
  isReverse?: boolean;
  showShadow?: boolean;
  shouldPauseOnHover?: boolean;
  isVertical?: boolean;
  gap?: string;
  duration?: number;
  iconClassName?: string;
}

export const ScrollingBanner = React.forwardRef<
  HTMLDivElement,
  IScrollingBannerProps
>(
  (
    {
      data,
      className,
      isReverse,
      isVertical = false,
      gap = "1rem",
      showShadow = true,
      shouldPauseOnHover = true,
      duration = 40,
      iconClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          "relative flex",
          {
            "w-full": !isVertical,
            "overflow-y-hidden": isVertical,
            "overflow-x-hidden": !isVertical,
            "max-h-[calc(100vh_-_200px)]": isVertical,
          },
          className,
        )}
        style={
          {
            "--gap": gap,
            "--duration": `${duration}s`,
          } as React.CSSProperties
        }
      >
        {showShadow && (
          <>
            <div
              className={cn(
                "pointer-events-none absolute z-10",
                isVertical
                  ? "from-primary-lighter/20 left-0 right-0 top-0 h-[300px] bg-gradient-to-b to-transparent"
                  : "from-primary-lighter/20 bottom-0 left-0 top-0 w-[300px] bg-gradient-to-r to-transparent",
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute z-10",
                isVertical
                  ? "from-primary-lighter/20 bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t to-transparent"
                  : "from-primary-lighter/20 bottom-0 right-0 top-0 w-[300px] bg-gradient-to-l to-transparent",
              )}
            />
          </>
        )}

        <ScrollArea.Root
          className="h-full w-full"
          type="always"
          scrollHideDelay={0}
        >
          <ScrollArea.Viewport className="h-full w-full !overflow-hidden">
            <div
              className={cn("flex w-max items-stretch gap-[--gap]", {
                "flex-col": isVertical,
                "h-full": isVertical,
                "animate-scrolling-banner": !isVertical,
                "animate-scrolling-banner-vertical": isVertical,
                "[animation-direction:reverse]": isReverse,
                "hover:[animation-play-state:paused]": shouldPauseOnHover,
              })}
            >
              {[...data, ...data, ...data].map((image, idx) => (
                <div
                  key={idx}
                  className="text-foreground z-10 flex items-center justify-center"
                >
                  <Image
                    className={cn("max-h-5 min-w-[140px]", iconClassName)}
                    width={100}
                    height={10}
                    src={image}
                    alt="news"
                  />
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation={isVertical ? "vertical" : "horizontal"}
            className="hidden"
          />
        </ScrollArea.Root>
      </div>
    );
  },
);
