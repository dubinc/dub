import { getCompanyLogoUrl } from "@/ui/submitted-leads/submitted-lead-utils";
import { sendBatchEmail } from "@dub/email";
import NewLeadSubmitted from "@dub/email/templates/new-lead-submitted";
import { prisma } from "@dub/prisma";
import { Partner, Program, SubmittedLead } from "@dub/prisma/client";

export async function notifyPartnerLeadSubmitted({
  lead,
  program,
  partner,
}: {
  lead: Pick<SubmittedLead, "id" | "name" | "email" | "company" | "formData">;
  program: Pick<Program, "workspaceId">;
  partner: Pick<Partner, "name" | "email" | "image">;
}) {
  const workspaceUsers = await prisma.projectUsers.findMany({
    where: {
      projectId: program.workspaceId,
      user: {
        email: {
          not: null,
        },
        isMachine: false,
      },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      project: {
        select: {
          slug: true,
        },
      },
    },
    take: 100,
    orderBy: {
      createdAt: "asc",
    },
  });

  // Parse formData from JSON
  const formData = lead.formData as { label: string; value: unknown }[] | null;

  const emailsRes = await sendBatchEmail(
    workspaceUsers.map(({ user, project }) => ({
      subject: "New partner lead submitted",
      variant: "notifications",
      to: user.email!,
      react: NewLeadSubmitted({
        email: user.email!,
        workspace: {
          slug: project.slug,
        },
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          image: getCompanyLogoUrl(lead.email),
          formData,
        },
        partner: {
          name: partner.name,
          email: partner.email,
          image: partner.image,
        },
      }),
    })),
  );

  console.log(`Resend email sent: ${JSON.stringify(emailsRes, null, 2)}`);
}
