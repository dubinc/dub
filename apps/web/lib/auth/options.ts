import { isBlacklistedEmail, updateConfig } from "@/lib/edge-config";
import jackson from "@/lib/jackson";
import { subscribe } from "@/lib/resend";
import { isStored, storage } from "@/lib/storage";
import { UserProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { PrismaClient } from "@dub/prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import LoginLink from "emails/login-link";
import WelcomeEmail from "emails/welcome-email";
import { User, type NextAuthOptions } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { createId } from "../api/utils";
import { completeProgramApplications } from "../partners/complete-program-applications";
import { FRAMER_API_HOST } from "./constants";
import {
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
} from "./lock-account";
import { validatePassword } from "./password";
import { trackLead } from "./track-lead";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

const CustomPrismaAdapter = (p: PrismaClient) => {
  return {
    ...PrismaAdapter(p),
    createUser: async (data: any) => {
      return p.user.create({
        data: {
          ...data,
          id: createId({ prefix: "user_" }),
        },
      });
    },
  };
};

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      sendVerificationRequest({ identifier, url }) {
        if (process.env.NODE_ENV === "development") {
          console.log(`Login link: ${url}`);
          return;
        } else {
          sendEmail({
            email: identifier,
            subject: `Your ${process.env.NEXT_PUBLIC_APP_NAME} Login Link`,
            react: LoginLink({ url, email: identifier }),
          });
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    {
      id: "saml",
      name: "BoxyHQ",
      type: "oauth",
      version: "2.0",
      checks: ["pkce", "state"],
      authorization: {
        url: `${process.env.NEXTAUTH_URL}/api/auth/saml/authorize`,
        params: {
          scope: "",
          response_type: "code",
          provider: "saml",
        },
      },
      token: {
        url: `${process.env.NEXTAUTH_URL}/api/auth/saml/token`,
        params: { grant_type: "authorization_code" },
      },
      userinfo: `${process.env.NEXTAUTH_URL}/api/auth/saml/userinfo`,
      profile: async (profile) => {
        let existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
        });

        // user is authorized but doesn't have a Dub account, create one for them
        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              id: createId({ prefix: "user_" }),
              email: profile.email,
              name: `${profile.firstName || ""} ${
                profile.lastName || ""
              }`.trim(),
            },
          });
        }

        const { id, name, email, image } = existingUser;

        return {
          id,
          name,
          email,
          image,
        };
      },
      options: {
        clientId: "dummy",
        clientSecret: process.env.NEXTAUTH_SECRET as string,
      },
      allowDangerousEmailAccountLinking: true,
    },
    CredentialsProvider({
      id: "saml-idp",
      name: "IdP Login",
      credentials: {
        code: {},
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const { code } = credentials;

        if (!code) {
          return null;
        }

        const { oauthController } = await jackson();

        // Fetch access token
        const { access_token } = await oauthController.token({
          code,
          grant_type: "authorization_code",
          redirect_uri: process.env.NEXTAUTH_URL as string,
          client_id: "dummy",
          client_secret: process.env.NEXTAUTH_SECRET as string,
        });

        if (!access_token) {
          return null;
        }

        // Fetch user info
        const userInfo = await oauthController.userInfo(access_token);

        if (!userInfo) {
          return null;
        }

        let existingUser = await prisma.user.findUnique({
          where: { email: userInfo.email },
        });

        // user is authorized but doesn't have a Dub account, create one for them
        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              id: createId({ prefix: "user_" }),
              email: userInfo.email,
              name: `${userInfo.firstName || ""} ${
                userInfo.lastName || ""
              }`.trim(),
            },
          });
        }

        const { id, name, email, image } = existingUser;

        return {
          id,
          email,
          name,
          email_verified: true,
          image,
          // adding profile here so we can access it in signIn callback
          profile: userInfo,
        };
      },
    }),

    // Sign in with email and password
    CredentialsProvider({
      id: "credentials",
      name: "Dub.co",
      type: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials) {
          throw new Error("no-credentials");
        }

        const { email, password } = credentials;

        if (!email || !password) {
          throw new Error("no-credentials");
        }

        const { success } = await ratelimit(5, "1 m").limit(
          `login-attempts:${email}`,
        );

        if (!success) {
          throw new Error("too-many-login-attempts");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            passwordHash: true,
            name: true,
            email: true,
            image: true,
            invalidLoginAttempts: true,
            emailVerified: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("invalid-credentials");
        }

        if (exceededLoginAttemptsThreshold(user)) {
          throw new Error("exceeded-login-attempts");
        }

        const passwordMatch = await validatePassword({
          password,
          passwordHash: user.passwordHash,
        });

        if (!passwordMatch) {
          const exceededLoginAttempts = exceededLoginAttemptsThreshold(
            await incrementLoginAttempts(user),
          );

          if (exceededLoginAttempts) {
            throw new Error("exceeded-login-attempts");
          } else {
            throw new Error("invalid-credentials");
          }
        }

        if (!user.emailVerified) {
          throw new Error("email-not-verified");
        }

        // Reset invalid login attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            invalidLoginAttempts: 0,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),

    // Framer
    {
      id: "framer",
      name: "Framer",
      type: "oauth",
      clientId: process.env.FRAMER_CLIENT_ID,
      clientSecret: process.env.FRAMER_CLIENT_SECRET,
      checks: ["state"],
      authorization: `${FRAMER_API_HOST}/auth/oauth/authorize`,
      token: `${FRAMER_API_HOST}/auth/oauth/token`,
      userinfo: `${FRAMER_API_HOST}/auth/oauth/profile`,
      profile({ sub, email, name, picture }) {
        return {
          id: sub,
          name,
          email,
          image: picture,
        };
      },
    },
  ],
  // @ts-ignore
  adapter: CustomPrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT
          ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
          : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      console.log({ user, account, profile });

      if (!user.email || (await isBlacklistedEmail(user.email))) {
        return false;
      }

      if (user?.lockedAt) {
        return false;
      }

      if (account?.provider === "google" || account?.provider === "github") {
        const userExists = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, name: true, image: true },
        });
        if (!userExists || !profile) {
          return true;
        }
        // if the user already exists via email,
        // update the user with their name and image
        if (userExists && profile) {
          const profilePic =
            profile[account.provider === "google" ? "picture" : "avatar_url"];
          let newAvatar: string | null = null;
          // if the existing user doesn't have an image or the image is not stored in R2
          if (
            (!userExists.image || !isStored(userExists.image)) &&
            profilePic
          ) {
            const { url } = await storage.upload(
              `avatars/${userExists.id}`,
              profilePic,
            );
            newAvatar = url;
          }
          await prisma.user.update({
            where: { email: user.email },
            data: {
              // @ts-expect-error - this is a bug in the types, `login` is a valid on the `Profile` type
              ...(!userExists.name && { name: profile.name || profile.login }),
              ...(newAvatar && { image: newAvatar }),
            },
          });
        }
      } else if (
        account?.provider === "saml" ||
        account?.provider === "saml-idp"
      ) {
        let samlProfile;

        if (account?.provider === "saml-idp") {
          // @ts-ignore
          samlProfile = user.profile;
          if (!samlProfile) {
            return true;
          }
        } else {
          samlProfile = profile;
        }

        if (!samlProfile?.requested?.tenant) {
          return false;
        }
        const workspace = await prisma.project.findUnique({
          where: {
            id: samlProfile.requested.tenant,
          },
        });
        if (workspace) {
          await Promise.allSettled([
            // add user to workspace
            prisma.projectUsers.upsert({
              where: {
                userId_projectId: {
                  projectId: workspace.id,
                  userId: user.id,
                },
              },
              update: {},
              create: {
                projectId: workspace.id,
                userId: user.id,
              },
            }),
            // delete any pending invites for this user
            prisma.projectInvite.delete({
              where: {
                email_projectId: {
                  email: user.email,
                  projectId: workspace.id,
                },
              },
            }),
          ]);
        }
        // Login with Framer
      } else if (account?.provider === "framer") {
        const userFound = await prisma.user.findUnique({
          where: {
            email: user.email,
          },
          include: {
            accounts: true,
          },
        });

        // account doesn't exist, let the user sign in
        if (!userFound) {
          // TODO: Remove this once we open up partners.dub.co to everyone
          await updateConfig({
            key: "partnersPortal",
            value: user.email,
          });
          return true;
        }

        const otherAccounts = userFound?.accounts.filter(
          (account) => account.provider !== "framer",
        );

        // we don't allow account linking for Framer partners
        // so redirect to the standard login page
        if (otherAccounts && otherAccounts.length > 0) {
          throw new Error("framer-account-linking-not-allowed");
        }

        return true;
      }
      return true;
    },
    jwt: async ({
      token,
      user,
      trigger,
    }: {
      token: JWT;
      user: User | AdapterUser | UserProps;
      trigger?: "signIn" | "update" | "signUp";
    }) => {
      if (user) {
        token.user = user;
      }

      // refresh the user's data if they update their name / email
      if (trigger === "update") {
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.sub },
        });
        if (refreshedUser) {
          token.user = refreshedUser;
        } else {
          return {};
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        id: token.sub,
        // @ts-ignore
        ...(token || session).user,
      };
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message.isNewUser) {
        const email = message.user.email as string;
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        });
        if (!user) {
          return;
        }
        // only send the welcome email if the user was created in the last 10s
        // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
        if (
          user.createdAt &&
          new Date(user.createdAt).getTime() > Date.now() - 10000 &&
          process.env.NEXT_PUBLIC_IS_DUB
        ) {
          waitUntil(
            Promise.allSettled([
              subscribe({ email, name: user.name || undefined }),
              sendEmail({
                subject: "Welcome to Dub.co!",
                email,
                react: WelcomeEmail({
                  email,
                  name: user.name || null,
                }),
                // send the welcome email 5 minutes after the user signed up
                scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                marketing: true,
              }),
              trackLead(user),
            ]),
          );
        }
      }
      // lazily backup user avatar to R2
      const currentImage = message.user.image;
      if (currentImage && !isStored(currentImage)) {
        waitUntil(
          (async () => {
            const { url } = await storage.upload(
              `avatars/${message.user.id}`,
              currentImage,
            );
            await prisma.user.update({
              where: {
                id: message.user.id,
              },
              data: {
                image: url,
              },
            });
          })(),
        );
      }

      // Complete any outstanding program applications
      waitUntil(completeProgramApplications(message.user.id));
    },
  },
};
