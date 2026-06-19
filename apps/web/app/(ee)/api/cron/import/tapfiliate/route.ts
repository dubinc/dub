import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { importCommissions } from "@/lib/tapfiliate/import-commissions";
import { importCustomers } from "@/lib/tapfiliate/import-customers";
import { importGroups } from "@/lib/tapfiliate/import-groups";
import { importPartners } from "@/lib/tapfiliate/import-partners";
import { tapfiliateImportPayloadSchema } from "@/lib/tapfiliate/schemas";
import { updateStripeCustomers } from "@/lib/tapfiliate/update-stripe-customers";
import { cleanupPartners } from "@/lib/tolt/cleanup-partners";
import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

export const POST = withCron(async ({ rawBody }) => {
  const payload = tapfiliateImportPayloadSchema.parse(JSON.parse(rawBody));

  switch (payload.action) {
    case "import-groups":
      await importGroups(payload);
      break;
    case "import-partners":
      await importPartners(payload);
      break;
    case "import-customers":
      await importCustomers(payload);
      break;
    case "import-commissions":
      await importCommissions(payload);
      break;
    case "update-stripe-customers":
      await updateStripeCustomers(payload);
      break;
    case "cleanup-partners":
      await cleanupPartners(payload);
      break;
  }

  // Import is finished, send the email to the workspace user
  const { programId, userId, importId } = payload;

  const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      name: true,
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  const workspaceUser = await prisma.projectUsers.findUniqueOrThrow({
    where: {
      userId_projectId: {
        userId,
        projectId: workspace.id,
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workspaceUser && workspaceUser.user.email) {
    await sendEmail({
      to: workspaceUser.user.email,
      subject: "Tapfiliate program imported",
      react: ProgramImported({
        email: workspaceUser.user.email,
        workspace,
        program,
        provider: "Tapfiliate",
        importId,
      }),
      headers: {
        "Idempotency-Key": importId,
      },
    });
  }

  return logAndRespond("Import is finished.");
});
