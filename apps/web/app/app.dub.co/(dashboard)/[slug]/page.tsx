import { PageContent } from "@/ui/layout/page-content";
import { cookies } from "next/headers";
import { getUserCookieService } from "../../../../core/services/cookie/user-session.service";
import WorkspaceLinksClient from "./custom-page-client";
import { LinksTitle } from "./links-title";

export default function WorkspaceLinks() {
  const cookieStore = cookies();
  const { sessionId, user } = getUserCookieService();

  console.log("WorkspaceLinks cookieStore all cookies:", cookieStore.getAll());
  console.log("WorkspaceLinks sessionId from service:", sessionId);
  console.log("WorkspaceLinks user from service:", user);

  const sessionIdFromCookie = cookieStore.get("session-id")?.value;
  const userTokenFromCookie = cookieStore.get("token")?.value;

  console.log("WorkspaceLinks sessionId from direct cookie:", sessionIdFromCookie);
  console.log("WorkspaceLinks userToken from direct cookie:", userTokenFromCookie);

  return (
    <PageContent title={<LinksTitle />}>
      <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px 0' }}>
        <h3>Cookie Debug Info:</h3>
        <p>Session ID from service: {sessionId || 'Not found'}</p>
        <p>Session ID from cookie: {sessionIdFromCookie || 'Not found'}</p>
        <p>User from service: {user ? 'Found' : 'Not found'}</p>
        <p>User token from cookie: {userTokenFromCookie ? 'Found' : 'Not found'}</p>
        <p>Total cookies: {cookieStore.getAll().length}</p>
      </div>
      <WorkspaceLinksClient />
    </PageContent>
  );
}
