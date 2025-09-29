import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { getSession } from "@/lib/auth";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { NextPage } from "next";
import { redirect } from "next/navigation";
import SettingsPageClient from "./page-client";

const SettingsPage: NextPage = async () => {
  const { user: authUser } = await getSession();

  const featuresAccess = await checkFeaturesAccessAuthLess(authUser.id);

  if (!featuresAccess.isSubscribed) {
    redirect("/");
  }

  return (
    <>
      <SettingsPageClient sessionId={authUser.id!} />
      <PageViewedTrackerComponent
        sessionId={authUser.id!}
        pageName="profile"
        params={{
          event_category: "Authorized",
          email: authUser?.email,
          content_group: "account",
        }}
      />
    </>
  );
};

export default SettingsPage;
