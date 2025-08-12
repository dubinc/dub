import { convertSessionUserToCustomerBody, getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PlansContent } from "@/ui/plans/plans-content.tsx";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { MaxWidthWrapper } from "@dub/ui";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker/page-viewed-tracker.component";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";
import { getMostScannedQr } from './getMostScannedQr';

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PlansPage: NextPage = async () => {
  const { user: cookieUser } = await getUserCookieService();
  const { user: authUser } = await getSession();

  const start = performance.now();
  const mostScannedQR = (await getMostScannedQr(
    cookieUser?.id || authUser.id,
  )) as QrStorageData | null;
  const end = performance.now();
  console.log("performance", end - start);

  const user = authUser.paymentData
    ? convertSessionUserToCustomerBody(authUser)
    : cookieUser;

  return (
    <>
      <PageContent>
        <MaxWidthWrapper>
          <PlansContent user={user!} mostScannedQR={mostScannedQR} />
        </MaxWidthWrapper>
      </PageContent>
      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="plans"
        params={{ event_category: "Authorized", email: authUser?.email }}
      />
    </>
  );
};

export default PlansPage;
