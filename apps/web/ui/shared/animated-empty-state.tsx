"use client";

import { Badge, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { CSSProperties, PropsWithChildren, ReactNode } from "react";

export function AnimatedEmptyState({
  title,
  description,
  cardContent,
  cardCount = 3,
  addButton,
  pillContent,
  learnMoreHref,
  learnMoreTarget = "_blank",
  learnMoreClassName,
  learnMoreText,
  className,
  cardClassName,
  cardContainerClassName,
}: {
  title: string;
  description: ReactNode;
  cardContent: ReactNode | ((index: number) => ReactNode);
  cardCount?: number;
  addButton?: ReactNode;
  pillContent?: string;
  learnMoreHref?: string;
  learnMoreTarget?: string;
  learnMoreClassName?: string;
  learnMoreText?: string;
  className?: string;
  cardClassName?: string;
  cardContainerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-lg border border-neutral-200 px-4 py-10 md:min-h-[500px]",
        className,
      )}
    >
      <div
        className={cn(
          "animate-fade-in h-36 w-full max-w-64 overflow-hidden px-4 [mask-image:linear-gradient(transparent,black_10%,black_90%,transparent)]",
          cardContainerClassName,
        )}
      >
        <div
          style={{ "--scroll": "-50%" } as CSSProperties}
          className="animate-infinite-scroll-y flex flex-col [animation-duration:10s]"
        >
          {[...Array(cardCount * 2)].map((_, idx) => (
            <Card key={idx} className={cardClassName}>
              {typeof cardContent === "function"
                ? cardContent(idx % cardCount)
                : cardContent}
            </Card>
          ))}
        </div>
      </div>
      {pillContent && <Badge variant="blueGradient">{pillContent}</Badge>}
      <div className="max-w-sm text-pretty text-center">
        <span className="text-base font-medium text-neutral-900">{title}</span>
        <div className="mt-2 text-pretty text-sm text-neutral-500">
          {description}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {addButton}
        {learnMoreHref && (
          <Link
            href={learnMoreHref}
            target={learnMoreTarget}
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

function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_4px_12px_0_#0000000D]",
        className,
      )}
    >
      {children}
    </div>
  );
}
