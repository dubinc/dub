import { getQrs } from "@/lib/api/qrs/get-qrs";
import { convertSessionUserToCustomerBody, getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PlansContent } from "@/ui/plans/plans-content.tsx";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { MaxWidthWrapper } from "@dub/ui";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PlansPage: NextPage = async () => {
  const { user: cookieUser } = await getUserCookieService();
  const { user: authUser } = await getSession();

  const qrs = await getQrs({
    userId: cookieUser?.id || authUser.id,
    sort: "clicks",
    sortBy: "clicks",
    sortOrder: "desc",
    showArchived: false,
    withTags: false,
    page: 1,
    pageSize: 100,
  });

  const mostScannedQR = (
    qrs && qrs.length > 0 ? qrs[0] : null
  ) as QrStorageData | null;

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
