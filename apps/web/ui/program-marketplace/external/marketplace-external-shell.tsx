import { cn } from "@dub/utils";
import { ReactNode } from "react";

const CONTAINER_CLASS = "mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8";

export function MarketplaceExternalShell({
  variant = "home",
  title,
  description,
  children,
}: {
  variant?: "home" | "list" | "none";
  title?: ReactNode;
  description?: string;
  children: ReactNode;
}) {
  if (variant === "none") {
    return (
      <div className={cn(CONTAINER_CLASS, "relative z-10 pb-10 pt-6")}>
        {children}
      </div>
    );
  }

  const resolvedTitle =
    title ??
    (variant === "home" ? (
      <>
        Best SaaS affiliate
        <br />
        programs in {new Date().getFullYear()}
      </>
    ) : (
      <>
        Discover your
        <br />
        next partnership
      </>
    ));

  const resolvedDescription =
    description ??
    "Explore the variety of SaaS affiliate programs in the Dub Program Marketplace and start monetizing your traffic/audience today.";

  return (
    <div className="relative z-10 flex flex-col">
      <div className={cn(CONTAINER_CLASS, "pb-12 pt-20")}>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[50px] font-medium leading-[1.1] text-neutral-900">
            {resolvedTitle}
          </h1>
          <p className="max-w-2xl text-lg font-normal text-neutral-600">
            {resolvedDescription}
          </p>
        </div>
      </div>
      <div className="h-px w-full bg-neutral-200" />
      <div className={cn(CONTAINER_CLASS, "py-10")}>{children}</div>
    </div>
  );
}
