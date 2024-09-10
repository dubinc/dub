"use server";

import { refreshDotsKYBComplianceFlow } from "../dots/refresh-kyb-compliance-flow";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

// Refresh the Dots app KYB compliance flow.
export const generateDotsComplianceFlow = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    await refreshDotsKYBComplianceFlow({
      appId: "94a1dca4-11b2-4e46-b957-b9b5860773d5",
    });

    return { success: true };
  });
