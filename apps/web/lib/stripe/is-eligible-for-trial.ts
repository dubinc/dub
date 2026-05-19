import { isGenericEmail } from "../is-generic-email";

// User is only eligible for a trial if they:
// - are on the free plan
// - are a new Stripe customer
// - have no prior/existing trial on workspace
// - are not using a generic email
export const isEligibleForTrial = ({
  workspace,
  session,
}: {
  workspace?: {
    plan?: string | null;
    stripeId?: string | null;
    trialEndsAt?: Date | null;
  } | null;
  session?: {
    user?: {
      email?: string | null;
    } | null;
  } | null;
}) => {
  if (!workspace || !session?.user?.email) return false;

  return (
    workspace.plan === "free" &&
    workspace.stripeId == null &&
    workspace.trialEndsAt == null &&
    !isGenericEmail(session.user.email)
  );
};
