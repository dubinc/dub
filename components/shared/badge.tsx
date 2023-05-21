import { truncate } from "@/lib/utils";
import clsx from "clsx";

export default function Badge({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <span
      className={clsx(
        "whitespace-nowrap rounded-md px-2 py-0.5 text-sm",
        color === "gray" && "bg-gray-100 text-gray-600",
        color === "red" && "bg-red-100 text-red-600",
        color === "yellow" && "bg-yellow-100 text-yellow-600",
        color === "green" && "bg-green-100 text-green-600",
        color === "blue" && "bg-blue-100 text-blue-600",
        color === "purple" && "bg-purple-100 text-purple-600",
        color === "pink" && "bg-pink-100 text-pink-600",
      )}
    >
      {truncate(name || "", 15)}
    </span>
  );
}

export function randomBadgeColor() {
  const colors = [
    "gray",
    "red",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
  ] as const;
  return colors[Math.floor(Math.random() * colors.length)];
}
