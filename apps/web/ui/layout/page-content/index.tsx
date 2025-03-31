import { NavButton } from "@/ui/layout/page-content/nav-button.tsx";
import { Logo } from "@/ui/shared/logo.tsx";
// import { MaxWidthWrapper } from "@dub/ui";
import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, ReactNode } from "react";
import { StepNavigation } from "../../../app/app.dub.co/(dashboard)/[slug]/new-qr/step-navigation.tsx";

export function PageContent({
  title,
  // titleBackButtonLink,
  // titleControls,
  // description,
  // hideReferButton,
  hasNavigation,
  // currentStep,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  titleBackButtonLink?: string;
  titleControls?: ReactNode;
  description?: ReactNode;
  hideReferButton?: boolean;
  hasNavigation?: boolean;
  currentStep?: number;
}>) {
  const hasTitle = title !== undefined;
  // const hasDescription = description !== undefined;

  return (
    <div>
      {/*<MaxWidthWrapper className="px-0 lg:px-0">*/}
      <div className="border-b-border-200 flex w-full items-center justify-between gap-4 border-b px-3 py-[6px] md:px-8 md:pb-4 md:pt-8">
        <Logo className={cn("md:hidden", hasNavigation && "[&_div]:hidden")} />
        {/*{(hasTitle || hasDescription) && (*/}
        {/*  <>*/}
        {/*    {hasTitle && (*/}
        {/*      <div className="flex items-center gap-2">*/}
        {/*        {titleBackButtonLink && (*/}
        {/*          <Link*/}
        {/*            href={titleBackButtonLink}*/}
        {/*            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"*/}
        {/*          >*/}
        {/*            <ChevronLeft className="size-5" />*/}
        {/*          </Link>*/}
        {/*        )}*/}
        {/*        <Title title={title} className="hidden md:flex" />*/}
        {/*      </div>*/}
        {/*    )}*/}
        {/*    {hasDescription && (*/}
        {/*      <p className="mt-1 hidden text-base text-neutral-500 md:block">*/}
        {/*        {description}*/}
        {/*      </p>*/}
        {/*    )}*/}
        {/*  </>*/}
        {/*)}*/}
        {hasNavigation && <StepNavigation />}
        <NavButton />
      </div>
      {/*{titleControls && (*/}
      {/*  <div className="hidden md:block">{titleControls}</div>*/}
      {/*)}*/}
      {/*<div className="flex w-full items-center justify-between gap-4">*/}
      {/*  <NavButton />*/}
      {/*{!hideReferButton && <ReferButton />}*/}
      {/*<HelpButtonRSC />*/}
      {/*<UserDropdown />*/}
      {/*</div>*/}
      {/*</MaxWidthWrapper>*/}
      <MaxWidthWrapper className="border-t-none md:border-t-border-200 mx-0 flex h-[calc(100vh-48px)] flex-col justify-start gap-4 py-4 md:h-full md:gap-8 md:border-t md:py-8">
        {/*{hasDescription && (*/}
        {/*  <MaxWidthWrapper className="">*/}
        {/*    <p className="mb-3 mt-1 text-base text-neutral-500 md:hidden">*/}
        {/*      {description}*/}
        {/*    </p>*/}
        {/*  </MaxWidthWrapper>*/}
        {/*)}*/}
        {hasTitle && <Title title={title} />}
        {children}
      </MaxWidthWrapper>
    </div>
  );
}

export function Title({
  title,
  className,
}: {
  title: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-neutral text-xl font-semibold leading-7 md:text-2xl",
        className,
      )}
    >
      {title}
    </h1>
  );
}
