import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren, ReactNode } from "react";
import { NavButton } from "./nav-button";

export function Page({
  title,
  children,
}: PropsWithChildren<{ title: ReactNode }>) {
  return (
    <div className="bg-neutral-100 sm:bg-white">
      <MaxWidthWrapper className="mt-3 sm:mt-6 sm:py-3">
        <div className="flex items-center gap-4">
          <NavButton />
          <h1 className="text-xl font-semibold leading-7 text-neutral-900 sm:text-2xl">
            {title}
          </h1>
        </div>
      </MaxWidthWrapper>
      <div className="bg-white max-sm:mt-3 max-sm:rounded-t-[16px]">
        {children}
      </div>
    </div>
  );
}
