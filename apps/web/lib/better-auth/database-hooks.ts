import { trackDubLead } from "@/lib/auth/track-dub-lead";
import { qstash } from "@/lib/cron";
import { isBlacklistedEmail } from "@/lib/edge-config";
import { completeProgramApplications } from "@/lib/partners/complete-program-applications";
import { prisma } from "@/lib/prisma";
import { isStored } from "@/lib/storage";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type { BetterAuthOptions } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { isVercelDeployment } from "../api/environment";
import { isSamlEnforcedForEmailDomain } from "../api/workspaces/is-saml-enforced-for-email-domain";
import {
  ACCOUNT_EXISTS_EMAIL_COOKIE,
  UNTRUSTED_IMPLICIT_LINK_PROVIDERS,
} from "./account-linking";
import { isAdminImpersonation } from "./admin-impersonation-plugin";
import { assertAdminAccess } from "./assert-admin-access";
import {
  backupUserAvatar,
  syncSocialProfileFromProvider,
} from "./sync-social-profile";
import { buildLookupKey } from "./utils";
import { deleteVerificationTokens } from "./verification-token";

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
      // Block silent GitHub / program SSO linking on sign-in. Explicit
      // linkSocial / oauth2.link while logged in still has a session.
      before: async (account, context) => {
        const { providerId, userId } = account;

        if (
          !providerId ||
          !userId ||
          !UNTRUSTED_IMPLICIT_LINK_PROVIDERS.has(providerId)
        ) {
          return;
        }

        if (context) {
          const session = await getSessionFromCtx(context).catch(() => null);

          if (session) {
            return;
          }
        }

        const existingAccountCount = await prisma.account.count({
          where: {
            userId,
          },
        });

        if (existingAccountCount === 0) {
          return;
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            email: true,
          },
        });

        if (user?.email && context) {
          context.setCookie(ACCOUNT_EXISTS_EMAIL_COOKIE, user.email, {
            path: "/",
            maxAge: 60 * 5,
            httpOnly: false,
            sameSite: "lax",
            secure: isVercelDeployment,
            domain: isVercelDeployment ? ".dub.co" : undefined,
          });
        }

        throw new APIError("UNAUTHORIZED", {
          message: "account not linked",
          code: "ACCOUNT_NOT_LINKED",
        });
      },

      // Runs after a provider account is linked
      after: async (account) => {
        const { providerId, userId, accessToken } = account;

        // Google and GitHub OAuth — fill missing name / R2 avatar
        if (["google", "github"].includes(providerId)) {
          waitUntil(
            syncSocialProfileFromProvider({
              userId,
              providerId,
              accessToken,
            }),
          );
        }

        // SAML SSO
        if (providerId === "saml") {
          const user = await prisma.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              id: true,
              email: true,
            },
          });

          if (!user?.email) {
            return;
          }

          const emailDomain = user.email.split("@")[1]?.toLocaleLowerCase();

          if (!emailDomain) {
            return;
          }

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

          await deleteVerificationTokens({
            lookupKey: buildLookupKey("invite", user.email, workspace.id),
          });
        }
      },
    },

    update: {
      // Runs after OAuth tokens refresh on subsequent Google/GitHub sign-ins
      after: async (account) => {
        if (!account) {
          return;
        }

        const { providerId, userId, accessToken } = account;

        if (
          !providerId ||
          !userId ||
          !["google", "github"].includes(providerId)
        ) {
          return;
        }

        waitUntil(
          syncSocialProfileFromProvider({
            userId,
            providerId,
            accessToken,
          }),
        );
      },
    },
  },

  session: {
    create: {
      // Runs before a session is created on every successful sign-in
      before: async (session, context) => {
        const user = await prisma.user.findUnique({
          where: {
            id: session.userId,
          },
          select: {
            id: true,
            email: true,
            lockedAt: true,
          },
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

        await assertAdminAccess(user.id);

        // Enforce SAML SSO for non-SAML callback requests
        const isSamlCallback =
          context?.params?.providerId === "saml" ||
          context?.path === "/sign-in/saml-idp";

        if (isSamlCallback) {
          return {
            data: session,
          };
        }

        if (!(await isSamlEnforcedForEmailDomain(user.email))) {
          return {
            data: session,
          };
        }

        // Only magic-link verify (admin impersonation) may bypass SAML.
        // The plugin before-hook sets adminImpersonationEmail on this request.
        if (await isAdminImpersonation({ context, email: user.email })) {
          return {
            data: session,
          };
        }

        throw new APIError("FORBIDDEN", {
          code: "REQUIRE_SAML_SSO",
          message: "SAML SSO is required for this email address.",
        });
      },

      // Runs after a session is created on every successful sign-in
      after: async (session) => {
        const user = await prisma.user.findUnique({
          where: {
            id: session.userId,
          },
          select: {
            id: true,
            email: true,
            image: true,
          },
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
