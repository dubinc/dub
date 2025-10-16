import { getQrDataFromRedis } from "@/lib/actions/pre-checkout-flow/get-qr-data-from-redis";
import { DashboardPlug } from "@/ui/paywall/components/dashboard-plug";
import { SidebarPlug } from "@/ui/paywall/components/sidebar-plug";
import { TrialOfferModal } from "@/ui/paywall/components/trial-offer-modal";
import { UserTokenReadingComponent } from "@/ui/paywall/components/user-token-reading";
import { QRBuilderData } from "@/ui/qr-builder/types/types";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { decodeUserMarketingToken } from "core/services/user-marketing-token.service";
import { NextPage } from "next";
import { redirect } from "next/navigation";

interface IPaywallPageProps {
  searchParams: { user_token: string | null };
}

const PaywallPage: NextPage<IPaywallPageProps> = async ({ searchParams }) => {
  const { user_token } = searchParams;

  const { sessionId, user, isPaidTraffic } = await getUserCookieService();

  if (!user?.email && !user_token) {
    return redirect("/");
  }

  if (user_token) {
    const decodedUserData = decodeUserMarketingToken(user_token);

    return (
      <UserTokenReadingComponent
        id={decodedUserData.id}
        email={decodedUserData.email}
        isPaidUser={decodedUserData.isPaidUser}
      />
    );
  }

  const { qrData: firstQr } = await getQrDataFromRedis(sessionId!);

  return (
    <>
      <div className="min-h-screen bg-neutral-100 md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <SidebarPlug />
        <DashboardPlug />
      </div>

      <TrialOfferModal
        user={user}
        firstQr={firstQr as QRBuilderData}
        isPaidTraffic={isPaidTraffic}
      />

      {!user_token && (
        <PageViewedTrackerComponent
          sessionId={sessionId!}
          pageName="paywall"
          params={{ event_category: "nonAuthorized" }}
        />
      )}
    </>
  );
};

export default PaywallPage;
