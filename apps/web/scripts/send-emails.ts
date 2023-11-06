import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { resend } from "./utils";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      projects: {
        some: {
          project: {
            slug: "steven",
          },
        },
      },
    },
    select: {
      name: true,
      email: true,
    },
  });

  await resend.batch.send(
    users.map(({ name, email }) => ({
      from: "Steven from Dub <steven@ship.dub.co>",
      to: [email as string],
      subject: "Hello from Dub",
      text: `Hi ${name},\n\nThis is a test email from Dub.`,
    })),
  );
}

main();
