import { ArrowUpRight } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { HTMLProps } from "react";

export const ConditionalLink = ({
  ref: _,
  href,
  className,
  children,
  ...rest
}: HTMLProps<HTMLAnchorElement>) => {
  return href ? (
    <Link
      href={href}
      className={cn(
        "group flex items-center decoration-dotted underline-offset-2 hover:text-neutral-950 hover:underline",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 truncate">{children}</div>
      <ArrowUpRight className="ml-1 size-3 shrink-0 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
};
