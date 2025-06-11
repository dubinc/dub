import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";
import { PageWidthWrapper } from "../page-width-wrapper";
import { NavButton } from "./nav-button";

export * from "./page-content-old";

export function PageContent({
  title,
  titleBackButtonLink,
  controls,
  className,
  contentWrapperClassName,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  titleBackButtonLink?: string;
  controls?: ReactNode;
  className?: string;
  contentWrapperClassName?: string;
}>) {
  const hasTitle = title !== undefined;
  const hasControls = controls !== undefined;

  return (
    <div
      className={cn(
        "rounded-t-[inherit] bg-neutral-100 md:bg-white",
        className,
      )}
    >
      <div className="border-border-muted border-b">
        <PageWidthWrapper>
          <div className="flex h-12 items-center justify-between gap-4 sm:h-16">
            <div className="flex min-w-0 items-center gap-4">
              <NavButton />
              {hasTitle && (
                <div className="flex items-center gap-2">
                  {titleBackButtonLink && (
                    <Link
                      href={titleBackButtonLink}
                      className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <ChevronLeft className="size-5" />
                    </Link>
                  )}
                  <h1 className="text-content-emphasis text-lg font-semibold leading-7">
                    {title}
                  </h1>
                </div>
              )}
            </div>
            {controls && (
              <div className="flex items-center gap-2">{controls}</div>
            )}
          </div>
        </PageWidthWrapper>
      </div>
      <div
        className={cn(
          "bg-white pt-3 max-md:rounded-t-[16px]",
          contentWrapperClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
