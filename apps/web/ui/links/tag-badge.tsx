import { ResourceColorsEnum } from "@/lib/types";
import { RESOURCE_COLORS } from "@/ui/colors";
import { useMediaQuery } from "@dub/ui";
import { cn, randomValue, truncate } from "@dub/utils";
import { Tag } from "lucide-react";

export default function TagBadge({
  name,
  color,
  withIcon,
  plus,
  className,
}: {
  name?: string;
  color: ResourceColorsEnum;
  withIcon?: boolean;
  plus?: number;
  className?: string;
}) {
  const { isDesktop } = useMediaQuery();

  return (
    <span
      className={cn(
        "my-auto block whitespace-nowrap rounded-md border px-2 py-0.5 text-sm",
        (withIcon || plus) &&
          "flex items-center gap-x-1.5 p-1.5 sm:rounded-md sm:px-2 sm:py-0.5",
        color === "red" && "border-red-300 bg-red-100 text-red-600",
        color === "yellow" && "border-yellow-300 bg-yellow-100 text-yellow-600",
        color === "green" && "border-green-300 bg-green-100 text-green-600",
        color === "blue" && "border-blue-300 bg-blue-100 text-blue-600",
        color === "purple" && "border-purple-300 bg-purple-100 text-purple-600",
        color === "brown" && "border-brown-300 bg-brown-100 text-brown-600",
        className,
      )}
    >
      {withIcon && <Tag className="h-3 w-3 shrink-0" />}
      {name && (
        <p {...(withIcon && { className: "hidden sm:inline-block" })}>
          {truncate(name || "", !isDesktop ? 20 : 24)}
        </p>
      )}
      {!!plus && (
        <span className="hidden sm:block">
          <span className="pr-1.5 opacity-30 md:pl-1 md:pr-2.5">|</span>+{plus}
        </span>
      )}
    </span>
  );
}

export function randomBadgeColor() {
  return randomValue(RESOURCE_COLORS);
}
