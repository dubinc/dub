import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";
import { HelpButtonRSC } from "../sidebar/help-button-rsc";
import { ReferButton } from "../sidebar/refer-button";
import UserDropdown from "../sidebar/user-dropdown";
import { NavButton } from "./nav-button";

export function PageContent({
  title,
  titleBackButtonLink,
  titleControls,
  description,
  hideReferButton,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  titleBackButtonLink?: string;
  titleControls?: ReactNode;
  description?: ReactNode;
  hideReferButton?: boolean;
}>) {
  const hasTitle = title !== undefined;
  const hasDescription = description !== undefined;

  return (
    <div className="bg-neutral100 md:bg-bgMain">
      <MaxWidthWrapper
        className={cn(
          "mt-3",
          (hasTitle || hasDescription) && "md:mt-6 md:py-3",
        )}
      >
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
                        className="text-neutral500 hover:bg-neutral100 hover:text-neutral900 rounded-lg p-1.5 transition-colors"
                      >
                        <ChevronLeft className="size-5" />
                      </Link>
                    )}
                    <h1 className="text-neutral900 text-xl font-semibold leading-7 md:text-2xl">
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
          <div className="flex items-center gap-4 md:hidden">
            {!hideReferButton && <ReferButton />}
            <HelpButtonRSC />
            <UserDropdown />
          </div>
        </div>
      </MaxWidthWrapper>
      <div className="bg-bgMain pt-2.5 max-md:mt-3 max-md:rounded-t-[16px]">
        {hasDescription && (
          <MaxWidthWrapper className="">
            <p className="text-neutral500 mb-3 mt-1 text-base md:hidden">
              {description}
            </p>
          </MaxWidthWrapper>
        )}
        {children}
      </div>
    </div>
  );
}
