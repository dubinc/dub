import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren, ReactNode } from "react";
import { HelpButtonRSC } from "../sidebar/help-button-rsc";
import UserDropdown from "../sidebar/user-dropdown";
import { NavButton } from "./nav-button";

export function PageContent({
  title,
  children,
}: PropsWithChildren<{ title: ReactNode }>) {
  return (
    <div className="bg-neutral-100 md:bg-white">
      <MaxWidthWrapper className="mt-3 md:mt-6 md:py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NavButton />
            <h1 className="text-xl font-semibold leading-7 text-neutral-900 md:text-2xl">
              {title}
            </h1>
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
