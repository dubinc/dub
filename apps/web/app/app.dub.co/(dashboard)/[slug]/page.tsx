import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import WorkspaceLinksClient from "./custom-page-client";
import { LinksTitle } from "./links-title";

const WorkspaceQRsPage = async () => {
  const { user: authUser } = await getSession();

  return (
    <>
      <PageContent title={<LinksTitle />}>
        <WorkspaceLinksClient />
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
