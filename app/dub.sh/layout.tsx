import { ReactNode } from "react";
import MarketingProviders from "./providers";
import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";
import Background from "#/ui/home/background";
import MobileNav from "#/ui/home/nav-mobile";

export const runtime = "edge";

export default function MarketingLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <MarketingProviders modal={modal}>
      <div className="flex min-h-screen flex-col justify-between">
        <MobileNav />
        <Nav />
        {children}
        <Footer />
        <Background />
      </div>
    </MarketingProviders>
  );
}
