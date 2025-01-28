import { BlurImage } from "@dub/ui";
import { cn } from "@dub/utils";
import { memo } from "react";

export const IntegrationLogo = memo(
  ({
    src,
    alt,
    className,
  }: {
    src: string | null;
    alt: string;
    className?: string;
  }) => (
    <div className="relative w-fit">
      {src ? (
        <>
          <BlurImage
            src={src}
            alt={alt}
            className={cn("relative size-8 rounded-md", className)}
            width={32}
            height={32}
          />
          <div className="pointer-events-none absolute inset-0 rounded-md border border-black/[0.075]" />
        </>
      ) : (
        <div className={cn("relative size-8 rounded-md", className)} />
      )}
    </div>
  ),
);
