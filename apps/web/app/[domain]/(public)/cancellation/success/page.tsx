import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowSuccessModule } from "@/ui/cancellation-flow/success/cancellation-flow-success.module";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { redirect } from "next/navigation";

const pageName = "subscription_cancelled";

const CancellationSuccessPage = async () => {
  const authSession = await getSession();

  if (!authSession?.user) {
    redirect("/cancellation/auth");
  }

  const { isScheduledForCancellation, isCancelled, nextBillingDate } =
    await checkSubscriptionStatusAuthLess(authSession.user.email);

  if (!isScheduledForCancellation) {
    return redirect("/workspace");
  }

  return (
    <>
      <CancellationFlowSuccessModule
        pageName={pageName}
        nextBillingDate={nextBillingDate!}
        isCancelled={isCancelled}
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

export default CancellationSuccessPage;
