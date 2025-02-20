import Stripe from "stripe";

type SecretName = "dub_token" | "dub_workspace";

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
  try {
    const secret = await stripe.apps.secrets.find({
      name,
      scope,
      expand: ["payload"],
    });

    if (!secret.payload) {
      return null;
    }

    return JSON.parse(secret.payload) as T;
  } catch (e) {
    return null;
  }
}

// Delete a secret for the account
export async function deleteSecret({
  stripe,
  name,
}: {
  stripe: Stripe;
  name: SecretName;
}) {
  return await stripe.apps.secrets.deleteWhere({
    name,
    scope,
  });
}
