import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowFeedbackModule } from "@/ui/cancellation-flow/feedback/cancellation-flow-feedback.module";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { redirect } from "next/navigation";

const pageName = "cancel_flow_feedback";

const CancellationFeedbackPage = async () => {
  const authSession = await getSession();

  if (!authSession?.user) {
    redirect("/cancellation/auth");
  }

  const { isScheduledForCancellation, isCancelled } =
    await checkSubscriptionStatusAuthLess(authSession.user.email);

  if (isScheduledForCancellation || isCancelled) {
    return redirect("/cancellation/success");
  }

  return (
    <>
      <CancellationFlowFeedbackModule
        pageName={pageName}
        sessionId={authSession?.user.id!}
        email={authSession?.user.email!}
      />

      <PageViewedTrackerComponent
        sessionId={authSession?.user.id!}
        pageName={pageName}
        params={{ event_category: "Authorized" }}
      />
    </>
  );
};

export default CancellationFeedbackPage;
