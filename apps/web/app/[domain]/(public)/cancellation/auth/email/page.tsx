import { getSession } from "@/lib/auth";
import { CancelFlowEnterEmailModule } from "@/ui/cancellation-flow/auth/email/cancel-flow-enter-email.module";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { NextPage } from "next";
import { redirect } from "next/navigation";

const pageName = "cancel_flow_enter_email";

const CancelFlowEnterEmail: NextPage = async () => {
  const { sessionId } = await getUserCookieService();

  const authSession = await getSession();

  if (authSession?.user) {
    redirect("/cancellation");
  }

  return (
    <>
      <CancelFlowEnterEmailModule pageName={pageName} sessionId={sessionId!} />

      <PageViewedTrackerComponent
        sessionId={sessionId!}
        pageName={pageName}
        params={{ event_category: "nonAuthorized" }}
      />
    </>
  );
};

export default CancelFlowEnterEmail;
