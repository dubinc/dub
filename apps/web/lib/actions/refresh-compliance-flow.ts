"use server";

import { z } from "zod";
import { refreshComplianceFlow } from "../dots/refresh-compliance-flow";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

export const refreshComplianceFlowAction = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;

    if (!workspace.dotsAppId) {
      throw new Error("Partner payouts are not enabled for this workspace.");
    }

    const { link } = await refreshComplianceFlow({
      dotsAppId: workspace.dotsAppId,
    });

    return {
      link,
    };
  });
