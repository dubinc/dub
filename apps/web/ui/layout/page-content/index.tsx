import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";
import { HelpButtonRSC } from "../sidebar/help-button-rsc";
import UserDropdown from "../sidebar/user-dropdown";
import { NavButton } from "./nav-button";

export function PageContent({
  title,
  description,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  description?: ReactNode;
}>) {
  const hasTitle = title !== undefined;
  const hasDescription = description !== undefined;

  return (
    <div className="bg-neutral-100 md:bg-white">
      <MaxWidthWrapper
        className={cn(
          "mt-3",
          (hasTitle || hasDescription) && "md:mt-6 md:py-3",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NavButton />
            {(hasTitle || hasDescription) && (
              <div>
                {hasTitle && (
                  <h1 className="text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
                    {title}
                  </h1>
                )}
                {hasDescription && (
                  <p className="mt-1 hidden text-base text-neutral-500 md:block">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 md:hidden">
            <HelpButtonRSC />
            <UserDropdown />
          </div>
        </div>
      </MaxWidthWrapper>
      <div className="bg-white pt-2.5 max-md:mt-3 max-md:rounded-t-[16px]">
        {hasDescription && (
          <MaxWidthWrapper className="">
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
