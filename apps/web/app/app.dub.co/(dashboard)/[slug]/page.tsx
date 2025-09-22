import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { fetchPrimerToken } from "@/lib/actions/fetch-primer-token";
import { getQrs } from "@/lib/api/qrs/get-qrs";
import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { Viewport } from "next";
import WorkspaceQRsClient from "./custom-page-client";
import { LinksTitle } from "./links-title";

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

const WorkspaceQRsPage = async () => {
  const { user: authUser } = await getSession();
  const { user } = await getUserCookieService();

  const qrs = await getQrs({
    userId: authUser.id,
    sort: "createdAt",
    sortBy: "createdAt",
    sortOrder: "desc",
    showArchived: true,
    withTags: false,
    page: 1,
    pageSize: 100,
  });

  const featuresAccess = await checkFeaturesAccessAuthLess(authUser.id);

  let primerClientToken = null;
  if (!featuresAccess.isSubscribed) {
    try {
      const result = await fetchPrimerToken();
      if (result?.data) {
        primerClientToken = result.data.clientToken;
      }
    } catch (error) {
      console.error("Failed to fetch primer token:", error);
    }
  }

  return (
    <>
      <PageContent title={<LinksTitle />}>
        <WorkspaceQRsClient
          initialQrs={qrs as any}
          featuresAccess={featuresAccess}
          user={authUser}
          cookieUser={
            user
              ? {
                  ...user,
                  paymentInfo: {
                    ...user?.paymentInfo,
                    ...(primerClientToken
                      ? { clientToken: primerClientToken }
                      : {}),
                  },
                }
              : null
          }
        />
      </PageContent>

      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="dashboard"
        params={{
          event_category: "Authorized",
          email: authUser?.email,
        }}
      />
    </>
  );
};

export default WorkspaceQRsPage;
