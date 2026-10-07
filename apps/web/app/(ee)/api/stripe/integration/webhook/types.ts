import { StripeMode } from "@/lib/types";
import { Project } from "@prisma/client";
import Stripe from "stripe";

export type WebhookHandlerResponse = {
  response: string;
};

export type WebhookHandlerInput<T extends Stripe.Event> = {
  event: T;
  mode: StripeMode;
  workspace: Pick<
    Project,
    "id" | "stripeConnectId" | "defaultProgramId" | "webhookEnabled"
  >;
};
