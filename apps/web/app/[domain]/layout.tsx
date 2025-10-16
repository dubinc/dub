import { AnalyticInitializerComponent } from "@/lib/analytic-initializer/analytic-initializer.component";
import { DomainClientProviders } from "@/ui/domain-client-providers";
import { ClientSessionComponent } from "core/integration/payment/client/client-session";
import { getUserCookieService } from "core/services/cookie/user-session.service";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionId } = await getUserCookieService();

  return (
    <DomainClientProviders>
      {children}
      <ClientSessionComponent blockSessionCreation />
      <AnalyticInitializerComponent sessionId={sessionId!} authSession={null} />
    </DomainClientProviders>
  );
}
