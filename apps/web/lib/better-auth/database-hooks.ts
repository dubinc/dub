import { trackDubLead } from "@/lib/auth/track-dub-lead";
import { qstash } from "@/lib/cron";
import { isBlacklistedEmail } from "@/lib/edge-config";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";

export const databaseHooks = {
  user: {
    create: {
      // Runs before a new user row is inserted
      before: async (user) => {
        if (!user.email || (await isBlacklistedEmail(user.email))) {
          throw new APIError("BAD_REQUEST", {
            message: "Unable to create account with this email.",
          });
        }

        return {
          data: {
            ...user,
            name: user.name || "",
          },
        };
      },

      // Runs after a new user row is inserted
      after: async (user) => {
        await prisma.userNotificationPreferences.upsert({
          where: {
            userId: user.id,
          },
          create: {
            userId: user.id,
          },
          update: {},
        });

        waitUntil(
          Promise.allSettled([
            trackDubLead({
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            }),

            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/welcome-user`,
              delay: 45 * 60,
              body: {
                userId: user.id,
              },
            }),
          ]),
        );
      },
    },
  },

  account: {
    create: {
      // Runs after a provider account is linked (Google/GitHub OAuth)
      after: async (account) => {
        if (
          account.providerId !== "google" &&
          account.providerId !== "github"
        ) {
          return;
        }

        const user = await getUser({
          id: account.userId,
        });

        if (!user?.image || isStored(user.image)) {
          return;
        }

        waitUntil(
          backupUserAvatar({
            userId: user.id,
            image: user.image,
          }),
        );
      },
    },
  },

  session: {
    create: {
      // Runs before a session is created on every successful sign-in
      before: async (session) => {
        const user = await getUser({
          id: session.userId,
        });

        if (!user?.email || (await isBlacklistedEmail(user.email))) {
          throw new APIError("FORBIDDEN", {
            message: "Unable to sign in with this account.",
          });
        }

        if (user.lockedAt) {
          throw new APIError("FORBIDDEN", {
            message: "exceeded-login-attempts",
          });
        }

        return {
          data: session,
        };
      },

      // Runs after a session is created on every successful sign-in
      after: async (session) => {
        const user = await getUser({
          id: session.userId,
        });

        if (!user?.email) {
          return;
        }

        const shouldBackupAvatar = !!user.image && !isStored(user.image);

        waitUntil(
          Promise.allSettled([
            // Lazily backup user avatar to R2
            ...(shouldBackupAvatar
              ? [
                  backupUserAvatar({
                    userId: user.id,
                    image: user.image!,
                  }),
                ]
              : []),

            completeProgramApplications(user.email),
          ]),
        );
      },
    },
  },
} satisfies BetterAuthOptions["databaseHooks"];

async function getUser(where: Prisma.UserWhereUniqueInput) {
  return prisma.user.findUnique({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lockedAt: true,
    },
  });
}

async function backupUserAvatar({
  userId,
  image,
}: {
  userId: string;
  image: string;
}) {
  const { url } = await storage.upload({
    key: `avatars/${userId}`,
    body: image,
  });

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      image: url,
    },
  });
}
