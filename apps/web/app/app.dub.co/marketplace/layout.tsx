import {
  MarketplaceExternalFooter,
  MarketplaceExternalHeader,
} from "@/ui/partners/program-marketplace/external/marketplace-external-header";
import { PropsWithChildren } from "react";

export default function MarketplaceExternalLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketplaceExternalHeader />
      <main className="flex-1">{children}</main>
      <MarketplaceExternalFooter />
    </div>
  );
}
