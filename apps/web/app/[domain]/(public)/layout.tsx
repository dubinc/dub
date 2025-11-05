import { getSession } from "@/lib/auth";
import { Header } from "@/ui/landing/components/header.tsx";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";

const Layout = async ({ children }) => {
  const { sessionId } = await getUserCookieService();
  const authSession = await getSession();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50/80">
      <Header sessionId={sessionId!} authSession={authSession} />
      {children}
    </div>
  );
};

export default Layout;
