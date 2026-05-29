import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createWorkflowLogger } from "@/lib/cron/qstash-workflow-logger";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";

const payloadSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  userId: z.string(),
});

type Payload = z.infer<typeof payloadSchema>;

// POST /api/workflows/partner-approved
export const { POST } = serve<Payload>(
  async (context) => {
    const input = context.requestPayload;
    const { programId, partnerId, userId } = input;

    const logger = createWorkflowLogger({
      workflowId: "partner-approved",
      workflowRunId: context.workflowRunId,
    });

    const {
      program,
      partner,
      links: existingPartnerLinks,
      ...programEnrollment
    } = await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
      include: {
        program: true,
        partner: true,
        links: true,
      },
    });

    const { groupId } = programEnrollment;

    const allPartnerLinks =
      ProgramPartnerLinkSchema.array().parse(existingPartnerLinks);

    // Step 1: Create partner default links
    await context.run("create-default-links", async () => {});
  },
  {
    initialPayloadParser: (requestPayload) => {
      return payloadSchema.parse(JSON.parse(requestPayload));
    },
  },
);
