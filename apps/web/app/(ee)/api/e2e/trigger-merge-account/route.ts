import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { triggerQStashWorkflow } from "@/lib/cron/qstash-workflow";
import { prisma } from "@/lib/prisma";
import { ACME_PROGRAM_ID, nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { assertE2EWorkspace } from "../guard";

const bodySchema = z.object({
  sourceEmail: z.email(),
  targetEmail: z.email(),
});

// POST /api/e2e/trigger-merge-account
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const { sourceEmail, targetEmail } = bodySchema.parse(
      await parseRequestBody(req),
    );

    if (sourceEmail.toLowerCase() === targetEmail.toLowerCase()) {
      throw new DubApiError({
        code: "bad_request",
        message: "Source and target emails must be different.",
      });
    }

    const partners = await prisma.partner.findMany({
      where: {
        email: { in: [sourceEmail, targetEmail] },
        programs: { some: { programId: ACME_PROGRAM_ID } },
      },
      select: { email: true },
    });

    const enrolledEmails = new Set(partners.map((p) => p.email?.toLowerCase()));

    if (
      !enrolledEmails.has(sourceEmail.toLowerCase()) ||
      !enrolledEmails.has(targetEmail.toLowerCase())
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Both partners must exist and be enrolled in the Acme test program.",
      });
    }

    const userId = `e2e-merge-${nanoid()}`;

    const res = await triggerQStashWorkflow({
      workflowType: "merge-partner-account",
      workflowLabel: userId,
      body: {
        userId,
        sourceEmail,
        targetEmail,
      },
      flowControl: {
        key: userId,
        parallelism: 1,
      },
    });

    return NextResponse.json(res);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
