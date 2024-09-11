"use server";

import { generateDotsKYBComplianceFlow } from "../dots/generate-kyb-compliance-flow";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

// Generate a URL to refresh the Dots app KYB compliance flow.
export const generateDotsComplianceFlowAction = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    if (!workspace.dotsAppId) {
      throw new Error("Enable Payouts in settings to use this feature.");
    }

    const response = await generateDotsKYBComplianceFlow({
      appId: workspace.dotsAppId,
    });

    return response;
  });
