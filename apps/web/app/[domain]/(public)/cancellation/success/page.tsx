import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowSuccessModule } from "@/ui/cancellation-flow/success/cancellation-flow-success.module";
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
    <CancellationFlowSuccessModule
      pageName={pageName}
      nextBillingDate={nextBillingDate!}
      isCancelled={isCancelled}
    />
  );
};

export default CancellationSuccessPage;
