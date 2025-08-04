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
