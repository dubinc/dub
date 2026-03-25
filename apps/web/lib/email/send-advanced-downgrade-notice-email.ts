import { sendEmail } from "@dub/email";
import AdvancedPlanDowngradeNotice from "@dub/email/templates/advanced-plan-downgrade-notice";
import { prisma } from "@dub/prisma";

export async function sendAdvancedDowngradeNoticeEmailIfNeeded({
  projectId,
  dedupeType,
  ownerEmail,
  workspaceName,
  workspaceSlug,
}: {
  projectId: string;
  dedupeType: string;
  ownerEmail: string | null | undefined;
  workspaceName: string;
  workspaceSlug: string;
}): Promise<void> {
  if (!ownerEmail) {
    return;
  }

  const existing = await prisma.sentEmail.findFirst({
    where: {
      projectId,
      type: dedupeType,
    },
  });

  if (existing) {
    return;
  }

  await sendEmail({
    to: ownerEmail,
    subject: "Your Advanced plan features have been updated",
    react: AdvancedPlanDowngradeNotice({
      email: ownerEmail,
      workspace: {
        name: workspaceName,
        slug: workspaceSlug,
      },
    }),
    variant: "notifications",
    headers: {
      "Idempotency-Key": `${dedupeType}:${projectId}`,
    },
  });

  await prisma.sentEmail.create({
    data: {
      projectId,
      type: dedupeType,
    },
  });
}
