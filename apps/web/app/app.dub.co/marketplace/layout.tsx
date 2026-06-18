import { MarketplaceExternalHeader } from "@/ui/program-marketplace/external/marketplace-external-header";
import { Footer } from "@dub/ui";
import { PropsWithChildren } from "react";

export default function MarketplaceExternalLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketplaceExternalHeader />
      <div className="relative flex flex-1 flex-col">
        <MarketplaceExternalGridLines />
        <main className="flex-1">{children}</main>
        <div className="relative z-10 h-px w-full bg-neutral-200" />
        <Footer className="border-t-0 md:rounded-t-none" />
      </div>
    </div>
  );
}

function MarketplaceExternalGridLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex justify-center"
    >
      <div className="relative h-full w-full max-w-screen-xl">
        <div className="absolute inset-y-0 left-0 w-px bg-neutral-200 [mask-image:linear-gradient(to_bottom,transparent,#000_96px)]" />
        <div className="absolute inset-y-0 right-0 w-px bg-neutral-200 [mask-image:linear-gradient(to_bottom,transparent,#000_96px)]" />
      </div>
    </div>
  );
}
