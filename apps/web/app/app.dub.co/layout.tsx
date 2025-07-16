import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { ReactNode } from "react";
import { ClientProviders } from "./client-providers.tsx";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const { sessionId } = await getUserCookieService();

  return <ClientProviders sessionId={sessionId!}>{children}</ClientProviders>;
};

export default AppLayout;
