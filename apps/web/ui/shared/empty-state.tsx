"use client";

import { buttonVariants, EmptyState as EmptyStateBlock } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { ComponentProps } from "react";

export default function EmptyState({
  buttonText,
  buttonLink,
  ...rest
}: {
  buttonText?: string;
  buttonLink?: string;
} & Omit<ComponentProps<typeof EmptyStateBlock>, "children">) {
  return (
    <EmptyStateBlock {...rest}>
      {buttonText && buttonLink && (
        <Link
          href={buttonLink}
          {...(buttonLink.startsWith("http") ? { target: "_blank" } : {})}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-8 items-center justify-center gap-2 rounded-md border px-4 text-sm",
          )}
        >
          <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            {buttonText}
          </span>
        </Link>
      )}
    </EmptyStateBlock>
  );
}
