import { qstash } from "@/lib/cron";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { sendBatchEmail } from "@dub/email";
import DomainExpired from "@dub/email/templates/domain-expired";
import DomainRenewalFailed from "@dub/email/templates/domain-renewal-failed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function processDomainRenewalFailure({
  invoice,
}: {
  invoice: Invoice;
}) {
  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: invoice.registeredDomains as string[],
      },
    },
    select: {
      slug: true,
      expiresAt: true,
    },
  });

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

  // Domain renewal failed 3 times:
  // 1. Turn off auto-renew for the domains on Dynadot
  // 2. Disable auto-renew for the domains on Dub
  // 3. Send email to the workspace users
  if (invoice.failedAttempts >= 3) {
    await Promise.allSettled(
      domains.map((domain) =>
        setRenewOption({
          domain: domain.slug,
          autoRenew: false,
        }),
      ),
    );

    const updateDomains = await prisma.registeredDomain.updateMany({
      where: {
        slug: {
          in: domains.map(({ slug }) => slug),
        },
      },
      data: {
        autoRenewalDisabledAt: new Date(),
      },
    });
    console.log(
      `Updated autoRenewalDisabledAt for ${updateDomains.count} domains.`,
    );

    if (workspaceOwners.length > 0) {
      await sendBatchEmail(
        workspaceOwners.map(({ user }) => ({
          variant: "notifications",
          to: user.email!,
          subject: "Domain expired",
          react: DomainExpired({
            email: user.email!,
            workspace: {
              name: workspace.name,
              slug: workspace.slug,
            },
            domains,
          }),
        })),
      );
    }
  }

  // We'll retry the invoice 3 times, if it fails 3 times, we'll turn off auto-renew for the domains
  if (invoice.failedAttempts < 3) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/invoices/retry-failed`,
      delay: 3 * 24 * 60 * 60, // 3 days in seconds
      deduplicationId: `${invoice.id}-attempt-${invoice.failedAttempts + 1}`,
      body: {
        invoiceId: invoice.id,
      },
    });

    if (workspaceOwners.length > 0) {
      await sendBatchEmail(
        workspaceOwners.map(({ user }) => ({
          variant: "notifications",
          to: user.email!,
          subject: "Domain renewal failed",
          react: DomainRenewalFailed({
            email: user.email!,
            workspace: {
              slug: workspace.slug,
            },
            domains,
          }),
        })),
      );
    }
  }
}
