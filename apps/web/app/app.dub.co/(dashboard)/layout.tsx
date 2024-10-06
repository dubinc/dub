import ChangelogPopup from "@/ui/layout/changelog-popup";
import { MainNav } from "@/ui/layout/main-nav";
import { HelpButtonRSC } from "@/ui/layout/sidebar/help-button-rsc";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";
import Providers from "../../providers";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen w-full bg-gray-50/80">
        <MainNav toolContent={<HelpButtonRSC />}>{children}</MainNav>
      </div>
      {/* <UserSurveyPopup /> */}
      <ChangelogPopup />
      <Toolbar show={["onboarding"]} />
    </Providers>
  );
}
