import { ReactNode } from "react";
import Nav from "#/ui/home/nav";
import Footer from "#/ui/home/footer";
import Background from "#/ui/home/background";
import MobileNav from "#/ui/home/nav-mobile";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <MobileNav />
      <Nav />
      {children}
      <Footer />
      <Background />
    </div>
  );
}
