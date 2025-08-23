import { cn } from "@dub/utils";

export function BountyThumbnailImage({
  type,
  className,
}: {
  type: "performance" | "submission";
  className?: string;
}) {
  return (
    <img
      {...(type === "performance"
        ? {
            src: "https://assets.dub.co/icons/trophy.webp",
            alt: "Trophy thumbnail",
          }
        : {
            src: "https://assets.dub.co/icons/heart.webp",
            alt: "Heart thumbnail",
          })}
      width={118}
      height={118}
      className={cn("mx-auto my-auto object-contain", className)}
      style={{
        display: "block",
        margin: "0 auto",
        maxWidth: "118px",
        maxHeight: "118px",
      }}
    />
  );
}
