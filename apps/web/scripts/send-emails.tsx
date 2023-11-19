import "dotenv-flow/config";
import prisma from "@/lib/prisma";

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

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(
      users.map(({ name, email }) => {
        return {
          from: "Steven from Dub <steven@ship.dub.co>",
          to: email,
          subject: "Hello from Dub",
          text: `Hi ${name},\n\nThis is a test email from Dub.\n\nBest,\nSteven`,
        };
      }),
    ),
  }).then((res) => res.json());

  console.log(response);
}

main();
