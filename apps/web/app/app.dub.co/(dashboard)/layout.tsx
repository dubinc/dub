import ChangelogPopup from "@/ui/layout/changelog-popup";
import HelpPortal from "@/ui/layout/help";
import NavTabs from "@/ui/layout/nav-tabs";
import UpgradeBanner from "@/ui/layout/upgrade-banner";
import UserDropdown from "@/ui/layout/user-dropdown";
import WorkspaceSwitcher from "@/ui/layout/workspace-switcher";
import { Divider } from "@/ui/shared/icons";
import { MaxWidthWrapper, NavLogo } from "@dub/ui";
import { constructMetadata } from "@dub/utils";
import Link from "next/link";
import { ReactNode, Suspense } from "react";
import Providers from "./providers";

export const dynamic = "force-static";
export const metadata = constructMetadata();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen w-full bg-gray-50">
        <div className="sticky left-0 right-0 top-0 z-20 border-b border-gray-200 bg-white">
          <MaxWidthWrapper>
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <Link href="/" className="hidden sm:block">
                  <NavLogo variant="symbol" isInApp />
                </Link>
                <Divider className="hidden h-8 w-8 text-gray-200 sm:ml-3 sm:block" />
                <WorkspaceSwitcher />
                <UpgradeBanner />
              </div>
              <div className="flex items-center space-x-6">
                <a
                  href="https://dub.co/changelog"
                  className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 sm:block"
                  target="_blank"
                >
                  Changelog
                </a>
                <a
                  href="https://dub.co/help"
                  className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 sm:block"
                  target="_blank"
                >
                  Help
                </a>
                <UserDropdown />
              </div>
            </div>
            <Suspense fallback={<div className="h-12 w-full" />}>
              <NavTabs />
            </Suspense>
          </MaxWidthWrapper>
        </div>
        {children}
      </div>
      {/* <UserSurveyPopup /> */}
      <ChangelogPopup />
      <HelpPortal />
    </Providers>
  );
}
