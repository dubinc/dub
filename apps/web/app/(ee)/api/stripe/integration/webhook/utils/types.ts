import { StripeMode } from "@/lib/types";
import { Project } from "@dub/prisma/client";

export type StripeWebhookInput = {
  mode: StripeMode;
  workspace: Pick<
    Project,
    | "id"
    | "stripeConnectId"
    | "defaultProgramId"
    | "webhookEnabled"
    | "stagingWorkspaceId"
  >;
};

export type StripeWebhookOutput = {
  response: string;
};
