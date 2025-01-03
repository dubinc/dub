import Stripe from "stripe";

type SecretName = "token" | "workspace";

// Secrets are stored on account level
const scope: Stripe.Apps.SecretCreateParams.Scope = {
  type: "account",
};

// Set a secret for the account
export async function setSecret({
  stripe,
  name,
  payload,
}: {
  stripe: Stripe;
  name: SecretName;
  payload: string;
}) {
  return await stripe.apps.secrets.create({
    name,
    payload,
    scope,
  });
}

// Get a secret for the account
export async function getSecret<T>({
  stripe,
  name,
}: {
  stripe: Stripe;
  name: SecretName;
}) {
  const secret = await stripe.apps.secrets.find({
    name,
    scope,
    expand: ["payload"],
  });

  return secret as T;
}
