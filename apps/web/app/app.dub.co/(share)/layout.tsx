import { Footer, Nav, NavMobile } from "@dub/ui";
import { ReactNode } from "react";

export default function dashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gray-50/80">
      <NavMobile staticDomain="app.dub.co" />
      <Nav staticDomain="app.dub.co" />
      {children}
      <Footer staticDomain="app.dub.co" />
    </div>
  );
}
