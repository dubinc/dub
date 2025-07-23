import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { NextPage } from "next";
import SettingsPageClient from "./page-client";

const SettingsPage: NextPage = async () => {
  const { sessionId } = await getUserCookieService();

  return <SettingsPageClient sessionId={sessionId!} />;
};

export default SettingsPage;
