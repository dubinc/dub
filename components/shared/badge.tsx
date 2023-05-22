import { TagColorProps } from "@/lib/types";
import { truncate } from "@/lib/utils";
import clsx from "clsx";
import { Tag } from "lucide-react";

export default function Badge({
  name,
  color,
  withIcon,
}: {
  name: string;
  color: TagColorProps;
  withIcon?: boolean;
}) {
  return (
    <span
      className={clsx(
        "whitespace-nowrap rounded-md px-2 py-0.5 text-sm",
        withIcon && "flex items-center space-x-1.5",
        color === "red" && "bg-red-100 text-red-600",
        color === "yellow" && "bg-yellow-100 text-yellow-600",
        color === "green" && "bg-green-100 text-green-600",
        color === "blue" && "bg-blue-100 text-blue-600",
        color === "purple" && "bg-purple-100 text-purple-600",
        color === "pink" && "bg-pink-100 text-pink-600",
        color === "brown" && "bg-brown-100 text-brown-600",
      )}
    >
      {withIcon && <Tag className="h-3 w-3" />}
      <p>{truncate(name || "", 15)}</p>
    </span>
  );
}

export function randomBadgeColor() {
  const colors = [
    "red",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "brown",
  ] as const;
  return colors[Math.floor(Math.random() * colors.length)];
}
