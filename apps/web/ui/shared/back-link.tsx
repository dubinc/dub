import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ComponentProps } from "react";

export function BackLink({
  children,
  className,
  ...rest
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group flex items-center gap-1 text-neutral-600 transition-colors duration-100 hover:text-neutral-700",
        className,
      )}
      {...rest}
    >
      <ChevronLeft
        className="size-3.5 transition-transform duration-100 group-hover:-translate-x-0.5"
        strokeWidth={2}
      />
      <span className="text-sm">{children}</span>
    </Link>
  );
}
