import { ReactNode } from "react";

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
  const resolvedTitle =
    title ??
    (variant === "home" ? (
      <>
        Dub Program
        <br />
        Marketplace
      </>
    ) : (
      "Find your next partnership"
    ));

  const resolvedDescription =
    description ??
    (variant === "home"
      ? "Discover partnerships on Dub and start earning."
      : "Explore the Dub Partner marketplace and start earning.");

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
      {variant !== "none" ? (
        <div className="mb-10 flex flex-col gap-4">
          <h1 className="font-display text-[50px] font-medium leading-[1.1] text-neutral-900">
            {resolvedTitle}
          </h1>
          <p className="max-w-2xl text-lg font-normal text-neutral-600">
            {resolvedDescription}
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
