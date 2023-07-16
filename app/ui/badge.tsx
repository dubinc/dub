import { cn } from "#/lib/utils";

export default function Badge({
  text,
  variant,
  className,
}: {
  text: string;
  variant?: "purple" | "blue" | "black" | "gray" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-px text-xs font-medium capitalize",
        {
          "border-violet-600 bg-violet-600 text-white": variant === "purple",
          "border-blue-500 bg-blue-500 text-white": variant === "blue",
          "border-black bg-black text-white": variant === "black",
          "border-gray-400 bg-gray-400 text-white": variant === "gray",
          "border-gray-400 text-gray-500": variant === "neutral",
        },
        className,
      )}
    >
      {text}
    </span>
  );
}
