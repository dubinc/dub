import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { getSession } from "@/lib/auth";
import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { Viewport } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

const WorkspaceAnalyticsPage = async () => {
  const { user: authUser } = await getSession();

  const { isSubscribed } = await checkFeaturesAccessAuthLess(authUser.id);

  if (!isSubscribed) {
    redirect("/");
  }

  return (
    <Suspense fallback={<LayoutLoader />}>
      <PageContent title="Analytics">
        <Analytics />
      </PageContent>
      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="dashboard"
        params={{
          event_category: "Authorized",
          email: authUser?.email,
          content_group: "statistics",
        }}
      />
    </Suspense>
  );
};

export default WorkspaceAnalyticsPage;
