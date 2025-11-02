import { initRedis } from "@/lib/actions/init-redis.ts";
import { LandingSectionsClient } from "@/ui/landing/landing-sections-client.tsx";
import { LandingSectionsServer } from "@/ui/landing/landing-sections-server.tsx";
import { APP_HOSTNAMES, APP_URL } from '@dub/utils';
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";

const MainPage: NextPage = async () => {
  const { sessionId } = await getUserCookieService();

  console.log("process.env.NEXT_PUBLIC_VERCEL_ENV", process.env.NEXT_PUBLIC_VERCEL_ENV);
  console.log("process.env.NEXTAUTH_URL", process.env.NEXTAUTH_URL);
  console.log("APP_URL", APP_URL);
  console.log("APP_HOSTNAMES", APP_HOSTNAMES);

  initRedis();

  return (
    <main className="relative mx-auto min-h-screen w-full pb-6 md:pb-12">
      <LandingSectionsClient sessionId={sessionId!} />

      <LandingSectionsServer />

      <PageViewedTrackerComponent
        sessionId={sessionId!}
        pageName="landing"
        params={{ event_category: "nonAuthorized" }}
      />
    </main>
  );
};

export default MainPage;
