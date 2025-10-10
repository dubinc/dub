import { getQrDataFromRedis } from "@/lib/actions/pre-checkout-flow/get-qr-data-from-redis";
import { DashboardPlug } from "@/ui/paywall/components/dashboard-plug";
import { SidebarPlug } from "@/ui/paywall/components/sidebar-plug";
import { TrialOffer } from "@/ui/paywall/components/trial-offer";
import { QrStorageData } from "@/ui/qr-builder/types/types";
import { getUserCookieService } from "core/services/cookie/user-session.service";

const PaywallPage = async () => {
  const { sessionId, user } = await getUserCookieService();

  const { qrData: firstQr } = await getQrDataFromRedis(sessionId!);

  return (
    <>
      <div className="min-h-screen bg-neutral-100 md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <SidebarPlug />
        <DashboardPlug />
      </div>
      {/* <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-100 bg-opacity-50 backdrop-blur-md">
        <TrialOffer user={user} firstQr={firstQr as QrStorageData} />
      </div> */}
      <TrialOffer user={user} firstQr={firstQr as QrStorageData} />
    </>
  );
};

export default PaywallPage;
