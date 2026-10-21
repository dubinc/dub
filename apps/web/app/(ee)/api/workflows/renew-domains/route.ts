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

    const renewedDomains: RenewedDomain[] = [];
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

      renewedDomains.push(...result.renewed);
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

    if (renewedDomains.length === 0) {
      return;
    }

    await context.run("send-renewal-email", async () => {
      return await sendRenewalEmail({
        invoiceId,
        renewedDomains,
      });
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

type RenewedDomain = {
  slug: string;
  expiresAt: string;
};

// Reads the domains on every attempt, so a domain renewed by an earlier attempt
// (its expiresAt is already extended past the threshold) is not renewed twice.
async function renewPendingDomains({ invoiceId }: { invoiceId: string }) {
  const skip = (outputLog: string) => ({
    outputLog,
    renewed: [] as RenewedDomain[],
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
  const alreadyAppliedThreshold = addDays(startOfDay(invoice.paidAt), 365);

  const domainsToRenew = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: slugs,
      },
      expiresAt: {
        lt: alreadyAppliedThreshold,
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

  const renewed: RenewedDomain[] = [];
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
        const newExpiresAt = addDays(renewalBase, 365);

        await prisma.registeredDomain.update({
          where: {
            id: domain.id,
          },
          data: {
            expiresAt: newExpiresAt,
            autoRenewalDisabledAt: null,
          },
        });

        renewed.push({
          slug: domain.slug,
          expiresAt: newExpiresAt.toISOString(),
        });
      }),
    );

    await sleep(500);
  }

  return {
    outputLog: `Renewed ${renewed.length}/${domainsToRenew.length} domains for invoice ${invoiceId}.`,
    renewed,
    failed,
  };
}

async function sendRenewalEmail({
  invoiceId,
  renewedDomains,
}: {
  invoiceId: string;
  renewedDomains: RenewedDomain[];
}) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    select: {
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

  const { workspace } = invoice;

  const ownerEmails = workspace.users
    .map(({ user }) => user.email)
    .filter((email): email is string => Boolean(email));

  if (ownerEmails.length === 0) {
    return "No users found to send domain renewal success email.";
  }

  // The email shows a single "active until" date, so use the earliest new expiry
  const earliestNewExpiresAt = renewedDomains
    .map(({ expiresAt }) => new Date(expiresAt))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  await sendBatchEmail(
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
  );

  return `Domain renewal success email sent to ${ownerEmails.length} users.`;
}
