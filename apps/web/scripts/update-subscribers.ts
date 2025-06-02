import { RESEND_AUDIENCES } from "@dub/email/resend/constants";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { Resend } from "resend";

async function main() {
  const partnerUsers = await prisma.user.findMany({
    where: {
      partners: {
        some: {},
      },
      projects: {
        none: {},
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    skip: 100,
    take: 100,
  });

  console.log(`Found ${partnerUsers.length} partner users`);

  for (const user of partnerUsers) {
    if (!user.email) {
      console.log(`Skipping ${user.id} because they have no email`);
      continue;
    }

    await Promise.all([
      subscribe({
        email: user.email,
        name: user.name,
        audience: "partners.dub.co",
      }),
      unsubscribe({
        email: user.email,
      }),
    ]);

    console.log(
      `Subscribed ${user.email} to partners.dub.co and unsubscribed from app.dub.co`,
    );
  }
}

main();

const resend = new Resend(process.env.RESEND_API_KEY);

const subscribe = async ({
  email,
  name,
  audience,
}: {
  email: string;
  name: string | null;
  audience: keyof typeof RESEND_AUDIENCES;
}) => {
  const audienceId = RESEND_AUDIENCES[audience];
  return await resend.contacts.create({
    email,
    ...(name && {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
    }),
    audienceId,
  });
};

const unsubscribe = async ({ email }: { email: string }) => {
  // TODO: Update this to support partners.dub.co in the future
  const audienceId = RESEND_AUDIENCES["app.dub.co"];

  return await resend.contacts.remove({
    email,
    audienceId,
  });
};
