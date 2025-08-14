import { checkFeaturesAccessAuthLess } from '@/lib/actions/check-features-access-auth-less';
import { convertSessionUserToCustomerBody, getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PlansContent } from "@/ui/plans/plans-content.tsx";
import { MaxWidthWrapper } from "@dub/ui";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker/page-viewed-tracker.component";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PlansPage: NextPage = async () => {
  const { user: cookieUser } = await getUserCookieService();
  const { user: authUser } = await getSession();

  const user = authUser.paymentData
    ? convertSessionUserToCustomerBody(authUser)
    : cookieUser;

  const featuresAccess = await checkFeaturesAccessAuthLess(authUser.id);

  return (
    <>
      <PageContent>
        <MaxWidthWrapper>
          <PlansContent user={user!} featuresAccess={featuresAccess} />
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
