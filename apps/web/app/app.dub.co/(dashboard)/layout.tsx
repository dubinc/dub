import { MainNav } from "@/ui/layout/main-nav";
import { AppSidebarNav } from "@/ui/layout/sidebar/app-sidebar-nav";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import { NewsRSC } from "@/ui/layout/sidebar/news-rsc";
import { ReferButton } from "@/ui/layout/sidebar/refer-button";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen w-full bg-white">
        <MainNav
          sidebar={AppSidebarNav}
          toolContent={
            <>
              <ReferButton />
              <HelpButtonRSC />
            </>
          }
          newsContent={<NewsRSC />}
        >
          {children}
        </MainNav>
      </div>
      <Toolbar show={["onboarding"]} />
    </>
  );
}
