import { cn } from "@dub/utils";
import { DownloadIcon } from "lucide-react";
import Image, { ImageProps } from "next/image";

export function AssetImage({
  className,
  imageContainerClassName,
  image,
}: {
  className?: string;
  imageContainerClassName?: string;
  image: Omit<ImageProps, "src"> & { src: string };
}) {
  return (
    <a
      href={image.src}
      download={image.src}
      className={cn(
        "relative block outline-none ring-inset ring-blue-500 focus-visible:ring",
        className,
      )}
    >
      <div className={cn("relative h-full w-full", imageContainerClassName)}>
        <Image {...image} className={cn("relative", image.className)} />
      </div>

      {/* Download button (shown on hover) */}
      <div className="group/inner absolute bottom-4 right-4 z-20 rounded-full px-3 py-3 shadow-sm transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:translate-y-2 sm:py-1 sm:opacity-0">
        {/* Background based on currentColor */}
        <div className="absolute inset-0 rounded-full bg-current opacity-0 group-hover/inner:opacity-[.05]"></div>

        {/* Border based on currentColor */}
        <div className="absolute inset-0 rounded-full border border-current opacity-[.15]"></div>

        <div className="flex items-center gap-2 text-sm">
          <DownloadIcon className="h-4 w-4" />
          <span className="hidden sm:block">Download</span>
        </div>
      </div>
    </a>
  );
}
