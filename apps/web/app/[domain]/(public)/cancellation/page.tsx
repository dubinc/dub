import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowModule } from "@/ui/cancellation-flow/cancellation-flow.module";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { redirect } from "next/navigation";

const pageName = "cancel_flow_or_return";

const CancellationPage = async () => {
  const authSession = await getSession();

  if (!authSession?.user) {
    redirect("/cancellation/auth");
  }

  const { isSubscribed, isScheduledForCancellation, isCancelled, isDunning } =
    await checkSubscriptionStatusAuthLess(authSession.user.email);

  if (isScheduledForCancellation || isCancelled) {
    return redirect("/cancellation/success");
  }

  if (!isSubscribed && !isDunning && !isCancelled) {
    return redirect("/");
  }

  return (
    <>
      <CancellationFlowModule
        pageName={pageName}
        sessionId={authSession?.user.id!}
      />

      <PageViewedTrackerComponent
        sessionId={authSession?.user.id!}
        pageName={pageName}
        params={{ event_category: "Authorized" }}
      />
    </>
  );
};

export default CancellationPage;
