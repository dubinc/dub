import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";

const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
const referredByPartnerId = "pn_1K2J9DRWPPJ2F1RX53N92TSGG";

async function main() {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      defaultGroupId: true,
    },
  });

  if (!program) {
    console.error(`Program not found: ${programId}`);
    return;
  }

  const suffix = nanoid(3);
  const email = `partner-${suffix}@dub-internal-test.com`;
  const name = `Partner ${suffix}`;

  const userId = createId({ prefix: "user_" });
  const partnerId = createId({ prefix: "pn_" });

  await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      emailVerified: new Date(),
      defaultPartnerId: partnerId,
    },
  });

  await prisma.partner.create({
    data: {
      id: partnerId,
      name,
      email,
    },
  });

  await prisma.partnerUser.create({
    data: {
      userId,
      partnerId,
      role: "owner",
      notificationPreferences: {
        create: {},
      },
    },
  });

  const applicationId = createId({ prefix: "pga_" });

  await prisma.programApplication.create({
    data: {
      id: applicationId,
      programId,
      partnerId,
      groupId: program.defaultGroupId,
      name,
      email,
      formData: { fields: [] },
      status: "pending",
    },
  });

  await prisma.programEnrollment.create({
    data: {
      id: createId({ prefix: "pge_" }),
      programId,
      partnerId,
      groupId: program.defaultGroupId,
      applicationId,
      status: "pending",
    },
  });

  const now = new Date();

  await prisma.programApplicationEvent.create({
    data: {
      programId,
      partnerId,
      programApplicationId: applicationId,
      referredByPartnerId,
      referralSource: "direct",
      visitedAt: now,
      startedAt: now,
      submittedAt: now,
      approvedAt: now,
    },
  });
}

main();
