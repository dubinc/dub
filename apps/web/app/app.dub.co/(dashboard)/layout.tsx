import { getSession } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/edge-config";
import { MainNav } from "@/ui/layout/main-nav";
import Toolbar from "@/ui/layout/toolbar/toolbar";
import UserSurveyPopup from "@/ui/layout/user-survey";
import { constructMetadata } from "@dub/utils";
import { ReactNode } from "react";
import Providers from "../../providers";

// TODO: Restore "force-static" when removing the sidenav feature flag
// export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  const { sidenav } = await getFeatureFlags({
    userId: (await getSession()).user.id,
  });

  return (
    <Providers>
      <div className="min-h-screen w-full bg-gray-50/80">
        <MainNav sidenav={sidenav}>{children}</MainNav>
      </div>
      <UserSurveyPopup />
      {/* <ChangelogPopup /> */}
      <Toolbar />
    </Providers>
  );
}
