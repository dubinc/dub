import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { sendBatchEmail } from "@dub/email";
import DomainRenewed from "@dub/email/templates/domain-renewed";
import { prisma } from "@dub/prisma";
import { Invoice } from "@dub/prisma/client";
import { pluralize } from "@dub/utils";
import { addDays } from "date-fns";

export async function processDomainRenewalInvoice({
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
    orderBy: {
      expiresAt: "asc",
    },
  });

  if (domains.length === 0) {
    console.log(`No domains found for invoice ${invoice.id}, skipping...`);
    return;
  }

  const newExpiresAt = addDays(domains[0].expiresAt, 365);

  await prisma.registeredDomain.updateMany({
    where: {
      id: {
        in: domains.map(({ id }) => id),
      },
    },
    data: {
      expiresAt: newExpiresAt,
      autoRenewalDisabledAt: null,
    },
  });

  await Promise.allSettled(
    domains.map((domain) =>
      setRenewOption({
        domain: domain.slug,
        autoRenew: true,
      }),
    ),
  );

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
    console.log("No users found to send domain renewal success email.");
    return;
  }

  await sendBatchEmail(
    workspaceOwners.map(({ user }) => ({
      variant: "notifications",
      to: user.email!,
      subject: `Your ${pluralize("domain", domains.length)} have been renewed`,
      react: DomainRenewed({
        email: user.email!,
        workspace: {
          slug: workspace.slug,
        },
        domains: domains.map(({ slug }) => ({ slug })),
        expiresAt: newExpiresAt,
      }),
    })),
  );
}
