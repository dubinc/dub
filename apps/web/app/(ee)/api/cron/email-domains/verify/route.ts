import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import { resend } from "@dub/email/resend/client";
import EmailDomainStatusChanged from "@dub/email/templates/email-domain-status-changed";
import { prisma } from "@dub/prisma";
import { EmailDomain } from "@dub/prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/email-domains/verify
// Runs every hour (0 * * * *)
export const GET = withCron(async () => {
  if (!resend) {
    return logAndRespond("Resend is not configured. Skipping verification...");
  }

  const domains = await prisma.emailDomain.findMany({
    where: {
      resendDomainId: {
        not: null,
      },
    },
    orderBy: {
      lastChecked: "asc",
    },
    take: 10,
  });

  if (domains.length === 0) {
    return logAndRespond("No email domains to check the verification status.");
  }

  for (const domain of domains) {
    try {
      await verifyEmailDomain(domain);
    } catch (error) {
      console.error(`Failed to verify domain ${domain.slug}:`, error);
    }
  }

  return logAndRespond("Email domains verification status checked.");
});

// Checks the verification status of an email domain
async function verifyEmailDomain(domain: EmailDomain) {
  if (!domain.resendDomainId) {
    return;
  }

  const { data: resendDomain, error } = await resend!.domains.get(
    domain.resendDomainId,
  );

  if (error) {
    return;
  }

  const updatedDomain = await prisma.emailDomain.update({
    where: {
      id: domain.id,
    },
    data: {
      status: resendDomain.status,
      lastChecked: new Date(),
    },
  });

  const statusChanged = updatedDomain.status !== domain.status;

  // Do nothing if the status has not changed
  if (!statusChanged) {
    console.log(
      `Email domain ${domain.slug} status has not changed. Skipping email notification...`,
    );

    return;
  }

  console.log(
    `Email domain ${domain.slug} status changed from ${domain.status} to ${updatedDomain.status}`,
  );

  const { users, ...workspace } = await getWorkspaceUsers({
    role: "owner",
    workspaceId: domain.workspaceId,
    notificationPreference: "domainConfigurationUpdates",
  });

  if (users.length === 0) {
    console.log(
      `No workspace owners found for domain ${domain.slug}. Skipping email notification...`,
    );
    return;
  }

  const subject =
    updatedDomain.status === "verified"
      ? "Your email domain has been verified"
      : updatedDomain.status === "failed"
        ? "Your email domain verification has failed"
        : "Your email domain status has changed";

  const resendResponse = await sendBatchEmail(
    users.map((user) => ({
      variant: "notifications",
      subject,
      to: user.email,
      react: EmailDomainStatusChanged({
        domain: domain.slug,
        oldStatus: domain.status,
        newStatus: updatedDomain.status,
        email: user.email,
        workspace: {
          slug: workspace.slug,
          name: workspace.name,
        },
      }),
    })),
  );

  if (resendResponse.error) {
    console.error(
      `Failed to send email notification for domain ${domain.slug}:`,
      resendResponse.error,
    );
  }
}
