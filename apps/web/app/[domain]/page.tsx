import { LandingModule } from "@/ui/landing/landing.module.tsx";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";

const MainPage: NextPage = async () => {
  const { sessionId } = await getUserCookieService();

  return (
    <>
      <LandingModule sessionId={sessionId!} />
      <PageViewedTrackerComponent
        sessionId={sessionId!}
        pageName="landing"
        params={{ event_category: "nonAuthorized" }}
      />
    </>
  );
};

export default MainPage;
