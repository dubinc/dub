import { SubmittedLeadStatusBadges } from "@/ui/submitted-leads/submitted-lead-status-badges";
import { getCompanyLogoUrl } from "@/ui/submitted-leads/submitted-lead-utils";
import { sendEmail } from "@dub/email";
import LeadStatusUpdated from "@dub/email/templates/lead-status-updated";
import { prisma } from "@dub/prisma";
import { SubmittedLead } from "@dub/prisma/client";

export async function notifySubmittedLeadStatusUpdate({
  lead,
  notes,
}: {
  lead: SubmittedLead;
  notes?: string | null;
}) {
  const [program, partner] = await Promise.all([
    prisma.program.findUnique({
      where: {
        id: lead.programId,
      },
      select: {
        name: true,
        slug: true,
      },
    }),

    prisma.partner.findUnique({
      where: {
        id: lead.partnerId,
      },
      select: {
        name: true,
        email: true,
      },
    }),
  ]);

  if (!program || !partner) return;

  const statusLabel = SubmittedLeadStatusBadges[lead.status].label;

  const emailRes = await sendEmail({
    subject: `Your submitted lead status has been updated to ${statusLabel}`,
    variant: "notifications",
    to: partner.email!,
    react: LeadStatusUpdated({
      partner: {
        name: partner.name,
        email: partner.email!,
      },
      program: {
        name: program.name,
        slug: program.slug,
      },
      lead: {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        image: getCompanyLogoUrl(lead.email),
        status: statusLabel,
      },
      notes,
    }),
  });

  console.log(`Resend email sent: ${JSON.stringify(emailRes, null, 2)}`);
}
