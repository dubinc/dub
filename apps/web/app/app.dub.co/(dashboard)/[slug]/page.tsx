import { getQrs } from "@/lib/api/qrs/get-qrs";
import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { Viewport } from "next";
import WorkspaceLinksClient from "./custom-page-client";
import { LinksTitle } from "./links-title";

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
    pageSize: 1,
  });

  return (
    <>
      <PageContent title={<LinksTitle />}>
        <WorkspaceLinksClient initialQrs={qrs as any} />
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
