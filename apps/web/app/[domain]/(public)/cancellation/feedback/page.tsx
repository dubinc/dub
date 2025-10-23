import { checkSubscriptionStatusAuthLess } from "@/lib/actions/check-subscription-status-auth-less";
import { getSession } from "@/lib/auth";
import { CancellationFlowFeedbackModule } from "@/ui/cancellation-flow/feedback/cancellation-flow-feedback.module";
import { redirect } from "next/navigation";

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

  return <CancellationFlowFeedbackModule />;
};

export default CancellationFeedbackPage;
