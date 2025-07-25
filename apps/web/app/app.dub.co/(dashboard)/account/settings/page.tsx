import { getSession } from "@/lib/auth";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { NextPage } from "next";
import SettingsPageClient from "./page-client";

const SettingsPage: NextPage = async () => {
  const { user: authUser } = await getSession();

  return (
    <>
      <SettingsPageClient sessionId={authUser.id!} />
      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="settings"
        params={{ event_category: "Authorized", email: authUser?.email }}
      />
    </>
  );
};

export default SettingsPage;
