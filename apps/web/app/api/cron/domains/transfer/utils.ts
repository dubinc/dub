import { sendEmail } from "@dub/email";
import { DomainTransferred } from "@dub/email/templates/domain-transferred";
import { prisma } from "@dub/prisma";

// Send email to the owner after the domain transfer is completed
export const sendDomainTransferredEmail = async ({
  domain,
  currentWorkspaceId,
  newWorkspaceId,
  linksCount,
}: {
  domain: string;
  currentWorkspaceId: string;
  newWorkspaceId: string;
  linksCount: number;
}) => {
  const currentWorkspace = await prisma.project.findUnique({
    where: {
      id: currentWorkspaceId,
    },
    select: {
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
  });

  const newWorkspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: newWorkspaceId,
    },
    select: {
      name: true,
      slug: true,
    },
  });

  const ownerEmail = currentWorkspace?.users[0]?.user?.email!;

  await sendEmail({
    subject: "Domain transfer completed",
    email: ownerEmail,
    react: DomainTransferred({
      email: ownerEmail,
      domain,
      newWorkspace,
      linksCount,
    }),
  });
};
