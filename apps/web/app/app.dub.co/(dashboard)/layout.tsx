import { MainNav } from "@/ui/layout/main-nav";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import UserSurveyPopup from "@/ui/layout/user-survey";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";
import Providers from "../../providers";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen w-full bg-gray-50/80">
        <MainNav>{children}</MainNav>
      </div>
      <UserSurveyPopup />
      {/* <ChangelogPopup /> */}
      <Toolbar />
    </Providers>
  );
}
