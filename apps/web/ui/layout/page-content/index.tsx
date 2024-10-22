import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";
import { HelpButtonRSC } from "../sidebar/help-button-rsc";
import UserDropdown from "../sidebar/user-dropdown";
import { NavButton } from "./nav-button";

export function PageContent({
  title,
  children,
}: PropsWithChildren<{ title?: ReactNode }>) {
  const hasTitle = title !== undefined;
  const TitleComponent = typeof title === "string" ? "h1" : "div";

  return (
    <div className="bg-neutral-100 md:bg-white">
      <MaxWidthWrapper className={cn("mt-3", hasTitle && "md:mt-6 md:py-3")}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <NavButton />
            {hasTitle && (
              <TitleComponent className="min-w-0 text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
                {title}
              </TitleComponent>
            )}
          </div>
          <div className="flex items-center gap-4 md:hidden">
            <HelpButtonRSC />
            <UserDropdown />
          </div>
        </div>
      </MaxWidthWrapper>
      <div className="bg-white pt-2.5 max-md:mt-3 max-md:rounded-t-[16px]">
        {children}
      </div>
    </div>
  );
}
