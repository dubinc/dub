import { getSession } from "@/lib/auth";
import { TrialStatusProvider } from "@/lib/contexts/trial-status-context";
import { MainNav } from "@/ui/layout/main-nav";
import { AppSidebarNav } from "@/ui/layout/sidebar/app-sidebar-nav";
import { constructMetadata } from "@dub/utils";
import { OauthTrackerComponent } from "core/integration/analytic/components/oauth-tracker.component.tsx";
import { ClientSessionComponent } from "core/integration/payment/client/client-session";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { cookies } from "next/headers";
import { ReactNode } from "react";

// export const dynamic = "force-static";
export const metadata = constructMetadata();

export default async function Layout({ children }: { children: ReactNode }) {
  const { user } = await getSession();
  const cookieStore = cookies();

  const oauthFlowCookie = cookieStore.get(ECookieArg.OAUTH_FLOW)?.value;

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
      {!user?.paymentData?.paymentInfo?.sub && <ClientSessionComponent />}
      {oauthFlowCookie && <OauthTrackerComponent oauthData={oauthFlowCookie} />}
    </TrialStatusProvider>
  );
}
