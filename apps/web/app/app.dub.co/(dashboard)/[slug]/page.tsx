import { getQrs } from "@/lib/api/qrs/get-qrs";
import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { Viewport } from "next";
import WorkspaceQRsClient from "./custom-page-client";
import { LinksTitle } from "./links-title";
import { checkFeaturesAccessAuthLess } from '@/lib/actions/check-features-access-auth-less';

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

const WorkspaceQRsPage = async () => {
  const { user: authUser } = await getSession();

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

  return (
    <>
      <PageContent title={<LinksTitle />}>
        <WorkspaceQRsClient initialQrs={qrs as any} featuresAccess={featuresAccess.featuresAccess} user={authUser} />
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
