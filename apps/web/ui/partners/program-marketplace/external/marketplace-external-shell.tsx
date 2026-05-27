import { ReactNode } from "react";

export function MarketplaceExternalShell({
  variant = "home",
  children,
}: {
  variant?: "home" | "list" | "none";
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
      {variant !== "none" ? (
        <div className="mb-10 flex flex-col gap-2">
          <h1 className="text-content-emphasis text-3xl font-semibold tracking-tight sm:text-4xl">
            {variant === "home"
              ? "Dub Program Marketplace"
              : "Find your next partnership"}
          </h1>
          <p className="text-content-subtle max-w-2xl text-base">
            {variant === "home"
              ? "Discover partnerships on Dub and start earning."
              : "Explore the Dub Partner marketplace and start earning."}
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
