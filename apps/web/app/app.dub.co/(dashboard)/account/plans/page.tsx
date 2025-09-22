import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { convertSessionUserToCustomerBody, getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { getMostScannedQr } from "@/ui/plans/actions/getMostScannedQr";
import { PlansContent } from "@/ui/plans/plans-content.tsx";
import { QrStorageData } from "@/ui/qr-builder/types/types";
import { MaxWidthWrapper } from "@dub/ui";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker/page-viewed-tracker.component";
import { NextPage } from "next";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PlansPage: NextPage = async () => {
  const { user: sessionUser } = await getSession();

  const user = convertSessionUserToCustomerBody(sessionUser);

  const featuresAccess = await checkFeaturesAccessAuthLess(sessionUser.id);

  const mostScannedQR = await getMostScannedQr(sessionUser.id);

  return (
    <>
      <PageContent>
        <MaxWidthWrapper>
          <PlansContent
            mostScannedQR={mostScannedQR as QrStorageData}
            user={user!}
            featuresAccess={featuresAccess}
          />
        </MaxWidthWrapper>
      </PageContent>
      <PageViewedTrackerComponent
        sessionId={sessionUser.id!}
        pageName="plans"
        params={{ event_category: "Authorized", email: sessionUser?.email }}
      />
    </>
  );
};

export default PlansPage;
