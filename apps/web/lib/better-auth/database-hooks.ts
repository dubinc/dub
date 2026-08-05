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
import { isSamlEnforcedForEmailDomain } from "../api/workspaces/is-saml-enforced-for-email-domain";

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
      // Runs after a provider account is linked
      after: async (account) => {
        const { providerId, userId } = account;

        // Google and GitHub OAuth
        if (["google", "github"].includes(providerId)) {
          const user = await getUser({
            id: userId,
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
        }

        // SAML SSO
        if (providerId === "saml") {
          const user = await getUser({
            id: userId,
          });

          if (!user?.email) {
            return;
          }

          const emailDomain = user.email.split("@")[1];

          const workspace = await prisma.project.findUnique({
            where: {
              ssoEmailDomain: emailDomain,
            },
            select: {
              id: true,
            },
          });

          if (!workspace) {
            return;
          }

          await prisma.$transaction([
            prisma.projectUsers.upsert({
              where: {
                userId_projectId: {
                  userId: user.id,
                  projectId: workspace.id,
                },
              },
              update: {},
              create: {
                projectId: workspace.id,
                userId: user.id,
              },
            }),

            prisma.projectInvite.deleteMany({
              where: {
                email: user.email,
                projectId: workspace.id,
              },
            }),
          ]);
        }
      },
    },
  },

  session: {
    create: {
      // Runs before a session is created on every successful sign-in
      before: async (session, context) => {
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

        // Enforce SAML SSO for non-SAML callback requests
        const isSamlCallback = context?.path?.startsWith(
          "/oauth2/callback/saml",
        );
        if (
          !isSamlCallback &&
          (await isSamlEnforcedForEmailDomain(user.email))
        ) {
          throw new APIError("FORBIDDEN", {
            code: "REQUIRE_SAML_SSO",
            message: "SAML SSO is required for this email address.",
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
