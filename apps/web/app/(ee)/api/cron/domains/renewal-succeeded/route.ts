import { parseRegisteredDomainSlugs } from "@/lib/api/domains/is-domain-registration-invoice";
import { withCron } from "@/lib/cron/with-cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import DomainRenewed from "@dub/email/templates/domain-renewed";
import { log, pluralize } from "@dub/utils";
import { addDays, startOfDay } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  invoiceId: z.string(),
});

// POST /api/cron/domains/renewal-succeeded - Renews domains for a given invoice
export const POST = withCron(async ({ rawBody }) => {
  const { invoiceId } = inputSchema.parse(JSON.parse(rawBody));

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      status: true,
      type: true,
      paidAt: true,
      registeredDomains: true,
      workspaceId: true,
    },
  });

  if (!invoice) {
    return logAndRespond(`Invoice ${invoiceId} not found.`);
  }

  if (invoice.type !== "domainRenewal") {
    return logAndRespond(
      `Invoice ${invoiceId} is not a domain renewal invoice. Skipping...`,
    );
  }

  if (invoice.status !== "completed") {
    return logAndRespond(`Invoice ${invoiceId} is not completed. Skipping...`);
  }

  const slugs = parseRegisteredDomainSlugs(invoice.registeredDomains);

  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: slugs,
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
  });

  if (domains.length === 0) {
    return logAndRespond(
      `No domains found for invoice ${invoiceId}. Skipping...`,
    );
  }

  const earliestExpiresAt = domains[0].expiresAt;
  const paidAtStart = startOfDay(invoice.paidAt!);

  if (earliestExpiresAt >= addDays(paidAtStart, 365)) {
    return logAndRespond(
      `Domain renewal for invoice ${invoiceId} already applied. Skipping...`,
    );
  }

  // Extend expiration by 1 year from the later of the current expiry or today.
  // If the domain hasn't expired yet, remaining time is preserved; if it's already
  // expired, the new term starts from today.
  const todayStart = startOfDay(new Date());
  const renewalBase =
    earliestExpiresAt > todayStart ? earliestExpiresAt : todayStart;
  const newExpiresAt = addDays(renewalBase, 365);

  const domainsRenewed: typeof domains = [];
  const domainsToUpdate: typeof domains = [];
  const domainsFailed: typeof domains = [];

  for (const domain of domains) {
    // Domain is already renewed, no further action needed
    if (domain.expiresAt >= newExpiresAt) {
      domainsRenewed.push(domain);
      continue;
    }

    const renewSucceeded = await setRenewOption({
      domain: domain.slug,
      autoRenew: true,
    });

    // Failed to set auto-renew option on Dynadot
    if (!renewSucceeded) {
      domainsFailed.push(domain);
      continue;
    }

    domainsToUpdate.push(domain);
    domainsRenewed.push(domain);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (domainsToUpdate.length > 0) {
    await prisma.registeredDomain.updateMany({
      where: {
        id: {
          in: domainsToUpdate.map(({ id }) => id),
        },
      },
      data: {
        expiresAt: newExpiresAt,
        autoRenewalDisabledAt: null,
      },
    });
  }

  if (domainsFailed.length > 0) {
    console.error(
      "Failed to set auto-renew option on Dynadot for the following domains:",
      domainsFailed.map(({ slug }) => slug).join(", "),
    );

    await log({
      message: `Domain renewal partially failed for invoice ${invoiceId}. See the logs for more details.`,
      type: "errors",
      mention: true,
    });
  }

  if (domainsRenewed.length === 0) {
    return logAndRespond(`No domains were renewed for invoice ${invoiceId}.`);
  }

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: invoice.workspaceId,
    },
    include: {
      users: {
        where: {
          role: "owner",
        },
        select: {
          user: true,
        },
      },
    },
  });

  const workspaceOwners = workspace.users.filter(({ user }) => user.email);

  if (workspaceOwners.length === 0) {
    return logAndRespond(
      "No users found to send domain renewal success email.",
    );
  }

  await sendBatchEmail(
    workspaceOwners.map(({ user }) => ({
      variant: "notifications",
      to: user.email!,
      subject: `Your ${pluralize("domain", domainsRenewed.length)} ${domainsRenewed.length === 1 ? "has" : "have"} been renewed`,
      react: DomainRenewed({
        email: user.email!,
        workspace: {
          slug: workspace.slug,
        },
        domains: domainsRenewed.map(({ slug }) => ({ slug })),
        expiresAt: newExpiresAt,
      }),
    })),
  );

  return logAndRespond(
    `Renewed ${domainsRenewed.length}/${domains.length} domains. Domain renewal success email sent to ${workspaceOwners.length} users.`,
  );
});
