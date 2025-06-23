import { TrialStatusProvider } from "@/lib/contexts/trial-status-context";
import { MainNav } from "@/ui/layout/main-nav";
import { AppSidebarNav } from "@/ui/layout/sidebar/app-sidebar-nav";
// import { NewsRSC } from "@/ui/layout/sidebar/news-rsc";
// import { ReferButton } from "@/ui/layout/sidebar/refer-button";
// import Toolbar from "@/ui/layout/toolbar/toolbar";
import { constructMetadata } from "@dub/utils";
import { ClientSessionComponent } from "core/integration/payment/client/client-session";
import { ReactNode } from "react";
import { AnalyticInitializerComponent } from "./analytic-initializer.component.tsx";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <TrialStatusProvider>
      <div className="min-h-screen w-full bg-white">
        <MainNav
          sidebar={AppSidebarNav}
          //* @USEFUL_FEATURE: navbar config *//
          // toolContent={
          //   <HelpButtonRSC />
          //   //   <>
          //   //     <ReferButton />
          //   //   </>
          // }
          // newsContent={<NewsRSC />}
        >
          {children}
        </MainNav>
      </div>
      {/*<Toolbar show={["onboarding"]} />*/}
      <ClientSessionComponent />
      <AnalyticInitializerComponent />
    </TrialStatusProvider>
  );
}
