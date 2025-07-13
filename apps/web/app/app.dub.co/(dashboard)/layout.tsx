import { TrialStatusProvider } from "@/lib/contexts/trial-status-context";
import { MainNav } from "@/ui/layout/main-nav";
import { AppSidebarNav } from "@/ui/layout/sidebar/app-sidebar-nav";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";

// export const dynamic = "force-static";
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
    </TrialStatusProvider>
  );
}
