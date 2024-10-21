import { Footer, Nav, NavMobile } from "@dub/ui";
import { ReactNode } from "react";

export default function ShareAnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50/80">
      <NavMobile />
      <Nav />
      {children}
      <Footer />
    </div>
  );
}
