import { getQrDataFromRedis } from "@/lib/actions/pre-checkout-flow/get-qr-data-from-redis";
import { DashboardPlug } from "@/ui/paywall/components/dashboard-plug";
import { SidebarPlug } from "@/ui/paywall/components/sidebar-plug";
import { TrialOfferModal } from "@/ui/paywall/components/trial-offer-modal";
import { QRBuilderData } from "@/ui/qr-builder/types/types";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { redirect } from "next/navigation";

const PaywallPage = async () => {
  const { sessionId, user, isPaidTraffic } = await getUserCookieService();

  const { qrData: firstQr } = await getQrDataFromRedis(sessionId!);

  if (!user?.email) {
    return redirect("/");
  }

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
    </>
  );
};

export default PaywallPage;
