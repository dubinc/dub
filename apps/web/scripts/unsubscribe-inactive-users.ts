// @ts-nocheck – install resend lib before running this script

import { limiter } from "@/lib/cron/limiter";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function main() {
  if (!resend) {
    console.error(
      "No RESEND_API_KEY is set in the environment variables. Skipping.",
    );
    return;
  }

  const where: Prisma.UserWhereInput = {
    email: {
      not: null,
    },
    subscribed: true,
    // more than 6 months
    createdAt: {
      lte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
    },
    projects: {
      none: {},
    },
    partners: {
      none: {},
    },
  };

  const users = await prisma.user.findMany({
    where,
    skip: 20000,
    take: 5000,
  });

  console.table(users, ["email", "createdAt"]);

  const response = await Promise.all(
    users.map((user) =>
      limiter.schedule(() =>
        resend.contacts.remove({
          email: user.email!,
          audienceId: "f5ff0661-4234-43f6-b0ca-a3f3682934e3",
        }),
      ),
    ),
  );

  console.table(response.map((r) => r.data));
  console.log(`Removed ${response.length} users from Resend audience`);
}

main();
