import { parseRegisteredDomainSlugs } from "@/lib/api/domains/is-domain-registration-invoice";
import { logger } from "@/lib/axiom/server";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import DomainRenewed from "@dub/email/templates/domain-renewed";
import { chunk, log, pluralize, sleep } from "@dub/utils";
import { serve } from "@upstash/workflow/nextjs";
import { addDays, startOfDay } from "date-fns";
import * as z from "zod/v4";

export const maxDuration = 600;

const inputSchema = z.object({
  invoiceId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 5;
const FIRST_RETRY_DELAY_SECONDS = 5 * 60;

/**
 * Renew Domains Workflow
 *
 * Runs after a domain renewal invoice is paid:
 *
 * 1. Turn on auto-renew on Dynadot for each domain and extend its expiresAt.
 * 2. Retry the domains that failed with exponential backoff (5, 10, 20 and 40 minutes).
 *    Dynadot failures are mostly short outages, so the steps catch them and the workflow
 *    sleeps instead of failing the step, which would return a 500 on every QStash retry.
 * 3. Alert once if domains still fail after the last attempt.
 * 4. Email the workspace owners about the renewed domains.
 */

// POST /api/workflows/renew-domains
export const { POST } = serve<Input>(
  async (context) => {
    const { invoiceId } = context.requestPayload;

    let failedSlugs: string[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await context.run(
        `renew-domains-attempt-${attempt}`,
        async () => {
          const result = await renewPendingDomains({
            invoiceId,
          });

          console.log(result.outputLog);

          return result;
        },
      );

      failedSlugs = result.failed;

      if (failedSlugs.length === 0 || attempt === MAX_ATTEMPTS) {
        break;
      }

      await context.sleep(
        `wait-before-attempt-${attempt + 1}`,
        FIRST_RETRY_DELAY_SECONDS * 2 ** (attempt - 1),
      );
    }

    if (failedSlugs.length > 0) {
      await context.run("report-failed-domains", async () => {
        console.error(
          `Failed to set auto-renew option on Dynadot after ${MAX_ATTEMPTS} attempts for the following domains:`,
          failedSlugs.join(", "),
        );

        await log({
          message: `Domain renewal failed for ${failedSlugs.length} ${pluralize("domain", failedSlugs.length)} on invoice ${invoiceId} after ${MAX_ATTEMPTS} attempts: ${failedSlugs.join(", ")}.`,
          type: "errors",
          mention: true,
        });
      });
    }

    await context.run("send-renewal-email", async () => {
      const outputLog = await sendRenewalEmail({
        invoiceId,
      });

      console.log(outputLog);

      return outputLog;
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return inputSchema.parse(JSON.parse(requestPayload));
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "renew-domains",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
      });

      await logger.flush();
    },
  },
);

// A domain of the invoice with expiresAt at or after this date is already renewed for this invoice
function getRenewedThreshold(paidAt: Date) {
  return addDays(startOfDay(paidAt), 365);
}

// Reads the domains on every attempt, so a domain renewed by an earlier attempt
// (its expiresAt is already extended past the threshold) is not renewed twice.
async function renewPendingDomains({ invoiceId }: { invoiceId: string }) {
  const skip = (outputLog: string) => ({
    outputLog,
    failed: [] as string[],
  });

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      status: true,
      type: true,
      paidAt: true,
      registeredDomains: true,
    },
  });

  if (!invoice) {
    return skip(`Invoice ${invoiceId} not found.`);
  }

  if (invoice.type !== "domainRenewal") {
    return skip(
      `Invoice ${invoiceId} is not a domain renewal invoice. Skipping...`,
    );
  }

  if (invoice.status !== "completed") {
    return skip(`Invoice ${invoiceId} is not completed. Skipping...`);
  }

  if (!invoice.paidAt) {
    return skip(`Invoice ${invoiceId} has no paidAt. Skipping...`);
  }

  const slugs = parseRegisteredDomainSlugs(invoice.registeredDomains);

  const todayStart = startOfDay(new Date());

  const domainsToRenew = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: slugs,
      },
      expiresAt: {
        lt: getRenewedThreshold(invoice.paidAt),
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

  if (domainsToRenew.length === 0) {
    return skip(
      `No domains left to renew for invoice ${invoiceId}. Skipping...`,
    );
  }

  let renewedCount = 0;
  const failed: string[] = [];

  for (const domainChunk of chunk(domainsToRenew, BATCH_SIZE)) {
    await Promise.all(
      domainChunk.map(async (domain) => {
        // The workflow alerts once after the last attempt, so skip the Slack alert per domain
        const renewSucceeded = await setRenewOption({
          domain: domain.slug,
          autoRenew: true,
          logFailure: false,
        });

        if (!renewSucceeded) {
          failed.push(domain.slug);
          return;
        }

        // Extend expiration by 1 year from the later of this domain's expiry or today.
        // Remaining time is preserved when not yet expired. Otherwise the new term starts from today.
        const renewalBase =
          domain.expiresAt > todayStart ? domain.expiresAt : todayStart;
        await prisma.registeredDomain.update({
          where: {
            id: domain.id,
          },
          data: {
            expiresAt: addDays(renewalBase, 365),
            autoRenewalDisabledAt: null,
          },
        });

        renewedCount++;
      }),
    );

    await sleep(500);
  }

  return {
    outputLog: `Renewed ${renewedCount}/${domainsToRenew.length} domains for invoice ${invoiceId}.`,
    failed,
  };
}

// Reads the renewed domains from the database, not from the attempt steps. A step that throws after
// some updates loses its return value, and its retry skips the domains that were already renewed.
async function sendRenewalEmail({ invoiceId }: { invoiceId: string }) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      type: true,
      paidAt: true,
      registeredDomains: true,
      workspace: {
        select: {
          slug: true,
          users: {
            where: {
              role: "owner",
            },
            select: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice || invoice.type !== "domainRenewal" || !invoice.paidAt) {
    return `Invoice ${invoiceId} is not a paid domain renewal invoice. Skipping the renewal email...`;
  }

  const renewedDomains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: parseRegisteredDomainSlugs(invoice.registeredDomains),
      },
      expiresAt: {
        gte: getRenewedThreshold(invoice.paidAt),
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
    select: {
      slug: true,
      expiresAt: true,
    },
  });

  if (renewedDomains.length === 0) {
    return `No renewed domains for invoice ${invoiceId}. Skipping the renewal email...`;
  }

  const { workspace } = invoice;

  const ownerEmails = workspace.users
    .map(({ user }) => user.email)
    .filter((email): email is string => Boolean(email));

  if (ownerEmails.length === 0) {
    return "No users found to send domain renewal success email.";
  }

  // The email shows a single "active until" date, so use the earliest new expiry (the list is sorted by expiresAt)
  const earliestNewExpiresAt = renewedDomains[0].expiresAt;

  const { error } = await sendBatchEmail(
    ownerEmails.map((email) => ({
      variant: "notifications",
      to: email,
      subject: `Your ${pluralize("domain", renewedDomains.length)} ${renewedDomains.length === 1 ? "has" : "have"} been renewed`,
      react: DomainRenewed({
        email,
        workspace: {
          slug: workspace.slug,
        },
        domains: renewedDomains.map(({ slug }) => ({ slug })),
        expiresAt: earliestNewExpiresAt,
      }),
    })),
    {
      idempotencyKey: `domain-renewed/${invoiceId}`,
    },
  );

  // Throw so that QStash retries the step. The idempotency key prevents a second email.
  if (error) {
    throw new Error(
      `Failed to send domain renewal email for invoice ${invoiceId}: ${error.message}`,
    );
  }

  return `Domain renewal success email sent to ${ownerEmails.length} users.`;
}
