import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowModule } from "@/ui/cancellation-flow/cancellation-flow.module";
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

  if (!isSubscribed) {
    return redirect("/");
  }

  return <CancellationFlowModule isDunning={isDunning} />;
};

export default CancellationPage;
