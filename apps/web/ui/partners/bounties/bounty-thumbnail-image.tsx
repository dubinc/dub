import { BountyProps } from "@/lib/types";
import { cn } from "@dub/utils";

export function BountyThumbnailImage({
  bounty,
  className,
}: {
  bounty: Pick<BountyProps, "type">;
  className?: string;
}) {
  return (
    <img
      {...(bounty.type === "performance"
        ? {
            src: "https://assets.dub.co/icons/trophy.webp",
            alt: "Trophy thumbnail",
          }
        : {
            src: "https://assets.dub.co/icons/heart.webp",
            alt: "Heart thumbnail",
          })}
      className={cn("size-full object-contain", className)}
    />
  );
}
