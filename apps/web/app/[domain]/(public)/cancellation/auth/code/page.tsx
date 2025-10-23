import { getSession } from "@/lib/auth";
import { CancelFlowEnterCodeModule } from "@/ui/cancellation-flow/auth/code/cancel-flow-enter-code.module";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { redirect } from "next/navigation";

const pageName = "cancel_flow_email_verification";

const CancellationAuthCodePage = async () => {
  const { user, sessionId } = await getUserCookieService();

  if (!user?.email) {
    redirect("/cancellation/auth");
  }

  const authSession = await getSession();

  if (authSession?.user) {
    redirect("/cancellation");
  }

  return (
    <>
      <CancelFlowEnterCodeModule
        email={user.email}
        sessionId={sessionId!}
        pageName={pageName}
      />

      <PageViewedTrackerComponent
        sessionId={sessionId!}
        pageName={pageName}
        params={{ event_category: "nonAuthorized" }}
      />
    </>
  );
};

export default CancellationAuthCodePage;
