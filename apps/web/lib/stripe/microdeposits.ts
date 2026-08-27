import { stripe } from "@/lib/stripe";
import type {
  MicrodepositType,
  PaymentMethodMicrodeposit,
  WorkspacePaymentMethod,
} from "@/lib/stripe/microdeposit-types";
import Stripe from "stripe";

export type {
  MicrodepositType,
  PaymentMethodMicrodeposit,
  WorkspacePaymentMethod,
};

export type PendingMicrodeposit = PaymentMethodMicrodeposit & {
  intentId: string;
  intentObject: "setup_intent" | "payment_intent";
  paymentMethodId: string;
  paymentMethod: Stripe.PaymentMethod | null;
};

type VerifyMicrodepositsParams = {
  amounts?: number[];
  descriptor_code?: string;
};

type VerifyMicrodepositsResource = {
  verifyMicrodeposits: (
    id: string,
    params: VerifyMicrodepositsParams,
  ) => Promise<Stripe.PaymentIntent | Stripe.SetupIntent>;
};

function getPaymentMethodFromIntent(
  paymentMethod:
    | Stripe.SetupIntent["payment_method"]
    | Stripe.PaymentIntent["payment_method"],
): { id: string; paymentMethod: Stripe.PaymentMethod | null } | null {
  if (!paymentMethod) {
    return null;
  }

  if (typeof paymentMethod === "string") {
    return { id: paymentMethod, paymentMethod: null };
  }

  if ("deleted" in paymentMethod && paymentMethod.deleted) {
    return null;
  }

  return {
    id: paymentMethod.id,
    paymentMethod,
  };
}

function getPendingMicrodepositFromIntent(
  intent: Stripe.SetupIntent | Stripe.PaymentIntent,
): PendingMicrodeposit | null {
  if (
    intent.status !== "requires_action" ||
    intent.next_action?.type !== "verify_with_microdeposits"
  ) {
    return null;
  }

  const paymentMethod = getPaymentMethodFromIntent(intent.payment_method);

  if (!paymentMethod) {
    return null;
  }

  const details = intent.next_action.verify_with_microdeposits;
  const type: MicrodepositType =
    details?.microdeposit_type === "descriptor_code"
      ? "descriptor_code"
      : "amounts";

  return {
    type,
    arrivalDate: details?.arrival_date ?? null,
    intentId: intent.id,
    intentObject:
      intent.object === "setup_intent" ? "setup_intent" : "payment_intent",
    paymentMethodId: paymentMethod.id,
    paymentMethod: paymentMethod.paymentMethod,
  };
}

export async function listPendingMicrodeposits(
  stripeId: string,
): Promise<PendingMicrodeposit[]> {
  const [setupIntents, paymentIntents] = await Promise.all([
    stripe.setupIntents.list({
      customer: stripeId,
      limit: 100,
      expand: ["data.payment_method"],
    }),
    stripe.paymentIntents.list({
      customer: stripeId,
      limit: 100,
      expand: ["data.payment_method"],
    }),
  ]);

  return [...setupIntents.data, ...paymentIntents.data]
    .map(getPendingMicrodepositFromIntent)
    .filter((pending): pending is PendingMicrodeposit => pending !== null);
}

export async function findPendingMicrodeposit({
  stripeId,
  paymentMethodId,
}: {
  stripeId: string;
  paymentMethodId: string;
}): Promise<PendingMicrodeposit | null> {
  const pending = await listPendingMicrodeposits(stripeId);

  return (
    pending.find((item) => item.paymentMethodId === paymentMethodId) ?? null
  );
}

export function withMicrodepositStatus({
  paymentMethods,
  pendingMicrodeposits,
}: {
  paymentMethods: Stripe.PaymentMethod[];
  pendingMicrodeposits: PendingMicrodeposit[];
}): WorkspacePaymentMethod[] {
  const pendingByPaymentMethodId = new Map(
    pendingMicrodeposits.map((pending) => [pending.paymentMethodId, pending]),
  );

  const methods: WorkspacePaymentMethod[] = paymentMethods.map(
    (paymentMethod) => {
      const pending = pendingByPaymentMethodId.get(paymentMethod.id);

      return {
        ...paymentMethod,
        microdeposit: pending
          ? { type: pending.type, arrivalDate: pending.arrivalDate }
          : null,
      };
    },
  );

  const listedIds = new Set(methods.map((method) => method.id));

  for (const pending of pendingMicrodeposits) {
    if (!pending.paymentMethod || listedIds.has(pending.paymentMethodId)) {
      continue;
    }

    methods.push({
      ...pending.paymentMethod,
      microdeposit: {
        type: pending.type,
        arrivalDate: pending.arrivalDate,
      },
    });
    listedIds.add(pending.paymentMethodId);
  }

  return methods;
}

export async function verifyIntentMicrodeposits({
  pending,
  amounts,
  descriptorCode,
}: {
  pending: PendingMicrodeposit;
  amounts?: [number, number];
  descriptorCode?: string;
}) {
  const params: VerifyMicrodepositsParams = descriptorCode
    ? { descriptor_code: descriptorCode.toUpperCase() }
    : { amounts };

  const resource =
    pending.intentObject === "setup_intent"
      ? stripe.setupIntents
      : stripe.paymentIntents;

  return (
    resource as unknown as VerifyMicrodepositsResource
  ).verifyMicrodeposits(pending.intentId, params);
}
