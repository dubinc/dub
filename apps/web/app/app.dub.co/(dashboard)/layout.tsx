import { MainNav } from "@/ui/layout/main-nav";
import NavTabs from "@/ui/layout/nav-tabs";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import UserSurveyPopup from "@/ui/layout/user-survey";
import { MaxWidthWrapper } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import { ReactNode, Suspense } from "react";
import Providers from "../../providers";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen w-full bg-gray-50/80">
        <div className="sticky -top-16 z-20 border-b border-gray-200 bg-white">
          <MaxWidthWrapper>
            <MainNav />
            <Suspense fallback={<div className="h-12 w-full" />}>
              <NavTabs />
            </Suspense>
          </MaxWidthWrapper>
        </div>
        {children}
      </div>
      <UserSurveyPopup />
      {/* <ChangelogPopup /> */}
      <Toolbar />
    </Providers>
  );
}
