import { getSession } from "@/lib/auth";
import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { Suspense } from "react";
import AnalyticsClient from "./client";

const WorkspaceAnalyticsPage = async () => {
  const { user: authUser } = await getSession();

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Analytics">
        <AnalyticsClient>
          <Analytics />
        </AnalyticsClient>
      </PageContent>
      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="analytics"
        params={{ event_category: "Authorized", email: authUser?.email }}
      />
    </Suspense>
  );
};

export default WorkspaceAnalyticsPage;
