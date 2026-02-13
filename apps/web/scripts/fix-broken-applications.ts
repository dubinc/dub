import { sendBatchEmail } from "@dub/email";
import NotifyPartnerReapply from "@dub/email/templates/notify-partner-reapply";
import { prisma } from "@dub/prisma";
import { chunk, groupBy } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const pendingProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      status: "pending",
      applicationId: {
        not: null,
      },
    },
    include: {
      partner: true,
      program: true,
      application: true,
    },
  });

  const missingApplications = pendingProgramEnrollments.filter(
    (p) => !p.application,
  );

  console.log(`Found ${missingApplications.length} missing applications`);

  console.table(
    missingApplications.map((p) => ({
      partner: p.partner.email,
      program: p.program.name,
      applicationId: p.applicationId,
      createdAt: p.createdAt,
    })),
  );

  const missingApplicationsByPartner = Object.entries(
    groupBy(missingApplications, (p) => p.partnerId),
  ).map(([_partnerId, enrollments]) => ({
    partner: {
      name: enrollments[0].partner.name,
      email: enrollments[0].partner.email!,
    },
    programs: enrollments.map((e) => ({
      name: e.program.name,
      slug: e.program.slug,
      logo: e.program.logo!,
    })),
  }));

  const chunks = chunk(missingApplicationsByPartner, 100);

  for (const chunk of chunks) {
    await sendBatchEmail(
      chunk.map((p) => ({
        subject: "Please resubmit your applications to these programs",
        to: p.partner.email,
        replyTo: "support@dub.co",
        react: NotifyPartnerReapply({
          partner: p.partner,
          programs: p.programs,
        }),
      })),
    );
  }

  const res = await prisma.programEnrollment.deleteMany({
    where: {
      id: {
        in: missingApplications.map((p) => p.id),
      },
    },
  });

  console.log("Deleted program enrollments", res);
}

main();
