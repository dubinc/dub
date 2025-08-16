import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";
import { HelpButtonRSC } from "../sidebar/help-button-rsc";
import UserDropdownOld from "../sidebar/user-dropdown-old";
import { NavButton } from "./nav-button";

/**
 * @deprecated Use PageContent instead
 */
export function PageContentOld({
  title,
  titleBackButtonLink,
  titleControls,
  description,
  showControls,
  className,
  contentWrapperClassName,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  titleBackButtonLink?: string;
  titleControls?: ReactNode;
  description?: ReactNode;
  showControls?: boolean;
  className?: string;
  contentWrapperClassName?: string;
}>) {
  const hasTitle = title !== undefined;
  const hasDescription = description !== undefined;

  return (
    <div
      className={cn(
        "mt-3 bg-neutral-100 md:bg-white",
        (hasTitle || hasDescription) && "md:mt-6 md:py-3",
        className,
      )}
    >
      <MaxWidthWrapper>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <NavButton />
            {(hasTitle || hasDescription) && (
              <div>
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
                    <h1 className="text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
                      {title}
                    </h1>
                  </div>
                )}
                {hasDescription && (
                  <p className="mt-1 hidden text-base text-neutral-500 md:block">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          {titleControls && (
            <div className="hidden md:block">{titleControls}</div>
          )}
          {showControls && (
            <div className="flex items-center gap-4 md:hidden">
              <HelpButtonRSC />
              <UserDropdownOld />
            </div>
          )}
        </div>
      </MaxWidthWrapper>
      <div
        className={cn(
          "bg-white pt-2.5 max-md:mt-3 max-md:rounded-t-[16px]",
          contentWrapperClassName,
        )}
      >
        {hasDescription && (
          <MaxWidthWrapper>
            <p className="mb-3 mt-1 text-base text-neutral-500 md:hidden">
              {description}
            </p>
          </MaxWidthWrapper>
        )}
        {children}
      </div>
    </div>
  );
}
