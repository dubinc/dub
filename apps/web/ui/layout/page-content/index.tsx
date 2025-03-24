import { NavButton } from "@/ui/layout/page-content/nav-button.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
import { MaxWidthWrapper } from "@dub/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PropsWithChildren, ReactNode } from "react";

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
    <div className="bg-neutral-100 py-4 md:bg-white md:pt-8">
      <MaxWidthWrapper>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex md:hidden">
              <Logo />
            </div>
            {(hasTitle || hasDescription) && ( // @TODO: Move this title to dashboard view
              <div className="hidden md:flex">
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
          {/*{titleControls && (*/}
          {/*  <div className="hidden md:block">{titleControls}</div>*/}
          {/*)}*/}
          <div className="flex items-center gap-4 md:hidden">
            <NavButton />
            {/*{!hideReferButton && <ReferButton />}*/}
            {/*<HelpButtonRSC />*/}
            {/*<UserDropdown />*/}
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
