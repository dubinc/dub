import { LandingModule } from "@/ui/landing/landing.module.tsx";
import { NextPage } from "next";
import { getUserCookieService } from "../../core/services/cookie/user-session.service.ts";

const MainPage: NextPage = async () => {
  const { sessionId } = await getUserCookieService();

  return <LandingModule sessionId={sessionId!} />;
};

export default MainPage;
