import { InfoTooltip, SimpleTooltipContent } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";
import { PageWidthWrapper } from "../page-width-wrapper";
import { NavButton } from "./nav-button";

export * from "./page-content-old";

export function PageContent({
  title,
  titleInfo,
  titleBackHref,
  controls,
  className,
  contentWrapperClassName,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  titleInfo?: ReactNode | { title: string; href: string };
  titleBackHref?: string;
  controls?: ReactNode;
  className?: string;
  contentWrapperClassName?: string;
}>) {
  if (!title) {
    return (
      <div
        className={cn(
          "rounded-t-[inherit] bg-neutral-100 md:bg-white",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  // Generate titleInfo from object if provided
  const finalTitleInfo =
    titleInfo &&
    typeof titleInfo === "object" &&
    "title" in titleInfo &&
    "href" in titleInfo ? (
      <InfoTooltip
        content={
          <SimpleTooltipContent
            title={titleInfo.title}
            href={titleInfo.href}
            cta="Learn more"
          />
        }
      />
    ) : (
      titleInfo
    );

  return (
    <div
      className={cn(
        "rounded-t-[inherit] bg-neutral-100 md:bg-white",
        className,
      )}
    >
      <div className="border-border-subtle border-b">
        <PageWidthWrapper>
          <div className="flex h-12 items-center justify-between gap-4 sm:h-16">
            <div className="flex min-w-0 items-center gap-4">
              <NavButton />
              <div className="flex items-center gap-2">
                {titleBackHref && (
                  <Link
                    href={titleBackHref}
                    className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <ChevronLeft className="size-5" />
                  </Link>
                )}
                <h1 className="text-content-emphasis text-lg font-semibold leading-7">
                  {title}
                </h1>
                {finalTitleInfo}
              </div>
            </div>
            {controls && (
              <div className="flex items-center gap-2">{controls}</div>
            )}
          </div>
        </PageWidthWrapper>
      </div>
      <div
        className={cn(
          "bg-white pt-3 max-md:rounded-t-[16px] lg:pt-6",
          contentWrapperClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
