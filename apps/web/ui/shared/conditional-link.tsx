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
        "cursor-alias decoration-dotted underline-offset-2 transition-colors hover:text-neutral-950 hover:underline",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
};
