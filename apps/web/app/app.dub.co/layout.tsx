import { AnalyticInitializerComponent } from "@/lib/analytic-initializer/analytic-initializer.component.tsx";
import { getSession } from "@/lib/auth";
import { ClientProviders } from "@/ui/client-providers.tsx";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { ReactNode } from "react";

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const { sessionId } = await getUserCookieService();

  return (
    <ClientProviders sessionId={sessionId!}>
      {children}
      <LayoutWithAuthContext sessionId={sessionId!} />
    </ClientProviders>
  );
};

const LayoutWithAuthContext = async ({ sessionId }: { sessionId: string }) => {
  const authSession = await getSession();

  return (
    <AnalyticInitializerComponent
      sessionId={sessionId!}
      authSession={authSession}
    />
  );
};

export default AppLayout;
