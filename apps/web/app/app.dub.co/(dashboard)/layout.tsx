import HelpPortal from "@/ui/layout/help";
import { MainNav } from "@/ui/layout/main-nav";
import NavTabs from "@/ui/layout/nav-tabs";
import { MaxWidthWrapper } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import { ReactNode, Suspense } from "react";
import Providers from "./providers";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen w-full bg-white">
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
      {/* <UserSurveyPopup /> */}
      {/* <ChangelogPopup /> */}
      <HelpPortal />
    </Providers>
  );
}
