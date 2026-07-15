import { parseRegisteredDomainSlugs } from "@/lib/api/domains/is-domain-registration-invoice";
import { withCron } from "@/lib/cron/with-cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import DomainRenewed from "@dub/email/templates/domain-renewed";
import { chunk, log, pluralize } from "@dub/utils";
import { RegisteredDomain } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const maxDuration = 600;

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  invoiceId: z.string(),
});

const BATCH_SIZE = 5;

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

  if (!invoice.paidAt) {
    return logAndRespond(`Invoice ${invoiceId} has no paidAt. Skipping...`);
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
    select: {
      id: true,
      slug: true,
      expiresAt: true,
    },
  });

  if (domains.length === 0) {
    return logAndRespond(
      `No domains found for invoice ${invoiceId}. Skipping...`,
    );
  }

  const todayStart = startOfDay(new Date());
  const alreadyAppliedThreshold = addDays(startOfDay(invoice.paidAt), 365);

  const domainsToRenew = domains.filter(
    (domain) => domain.expiresAt < alreadyAppliedThreshold,
  );

  const domainsFailed: typeof domains = [];
  const domainsRenewed: Pick<RegisteredDomain, "slug" | "expiresAt">[] = [];

  const succeeded: {
    domain: (typeof domains)[number];
    newExpiresAt: Date;
  }[] = [];

  for (const domainChunk of chunk(domainsToRenew, BATCH_SIZE)) {
    const results = await Promise.all(
      domainChunk.map(async (domain) => {
        const renewSucceeded = await setRenewOption({
          domain: domain.slug,
          autoRenew: true,
        });

        return {
          domain,
          renewSucceeded,
        };
      }),
    );

    for (const { domain, renewSucceeded } of results) {
      if (!renewSucceeded) {
        domainsFailed.push(domain);
        continue;
      }

      // Extend expiration by 1 year from the later of this domain's expiry or today.
      // Remaining time is preserved when not yet expired; otherwise the new term
      // starts from today.
      const renewalBase =
        domain.expiresAt > todayStart ? domain.expiresAt : todayStart;

      succeeded.push({
        domain,
        newExpiresAt: addDays(renewalBase, 365),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  for (const updateChunk of chunk(succeeded, BATCH_SIZE)) {
    await Promise.all(
      updateChunk.map(async ({ domain, newExpiresAt }) => {
        await prisma.registeredDomain.update({
          where: {
            id: domain.id,
          },
          data: {
            expiresAt: newExpiresAt,
            autoRenewalDisabledAt: null,
          },
        });

        domainsRenewed.push({
          slug: domain.slug,
          expiresAt: newExpiresAt,
        });
      }),
    );
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

    throw new Error(
      `Domain renewal partially failed for invoice ${invoiceId}.`,
    );
  }

  if (domainsRenewed.length === 0) {
    return logAndRespond(
      `Domain renewal for invoice ${invoiceId} already applied. Skipping...`,
    );
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

  // Email shows a single "active until" date; use the earliest new expiry.
  const earliestNewExpiresAt = domainsRenewed
    .map(({ expiresAt }) => expiresAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];

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
        expiresAt: earliestNewExpiresAt,
      }),
    })),
  );

  return logAndRespond(
    `Renewed ${domainsRenewed.length}/${domains.length} domains. Domain renewal success email sent to ${workspaceOwners.length} users.`,
  );
});
