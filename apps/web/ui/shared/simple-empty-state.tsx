"use client";

import { Badge, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { ReactNode } from "react";

export function SimpleEmptyState({
  title,
  description,
  graphic,
  addButton,
  pillContent,
  learnMoreHref,
  learnMoreClassName,
  learnMoreText,
  className,
}: {
  title: string;
  description: string;
  graphic?: ReactNode;
  addButton?: ReactNode;
  pillContent?: string;
  learnMoreHref?: string;
  learnMoreClassName?: string;
  learnMoreText?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-4 py-10 md:min-h-[calc(100vh-10rem)]",
        className,
      )}
    >
      {graphic && <div className="flex flex-col items-center">{graphic}</div>}
      {pillContent && <Badge variant="blueGradient">{pillContent}</Badge>}
      <div className="max-w-[350px] text-pretty text-center">
        <span className="text-base font-medium text-neutral-900">{title}</span>
        <p className="mt-2 text-pretty text-sm text-neutral-500">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {addButton}
        {learnMoreHref && (
          <Link
            href={learnMoreHref}
            target="_blank"
            className={cn(
              buttonVariants({ variant: addButton ? "secondary" : "primary" }),
              "flex h-9 items-center whitespace-nowrap rounded-lg border px-4 text-sm",
              learnMoreClassName,
            )}
          >
            {learnMoreText || "Learn more"}
          </Link>
        )}
      </div>
    </div>
  );
}
