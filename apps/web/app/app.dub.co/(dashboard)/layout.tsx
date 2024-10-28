import { MainNav } from "@/ui/layout/main-nav";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import { NewsRSC } from "@/ui/layout/sidebar/news-rsc";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="min-h-screen w-full bg-white">
        <MainNav toolContent={<HelpButtonRSC />} newsContent={<NewsRSC />}>
          {children}
        </MainNav>
      </div>
      {/* <ChangelogPopup /> */}
      <Toolbar show={["onboarding"]} />
    </>
  );
}
