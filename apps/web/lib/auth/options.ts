import { convertSessionUserToCustomerBody, Session } from "@/lib/auth/utils.ts";
import { isBlacklistedEmail } from "@/lib/edge-config";
import { isStored, storage } from "@/lib/storage";
import { UserProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { waitUntil } from "@vercel/functions";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import {
  applyUserSession,
  getUserCookieService,
} from "core/services/cookie/user-session.service.ts";
import { User, type NextAuthOptions } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { completeProgramApplications } from "../partners/complete-program-applications";
import {
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
} from "./lock-account";
import { validatePassword } from "./password";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      sendVerificationRequest({ identifier, url }) {
        prisma.user
          .findUnique({
            where: {
              email: identifier,
            },
            select: {
              id: true,
            },
          })
          .then(async (user) => {
            if (process.env.NODE_ENV === "development") {
              console.log(`Login link: ${url}`);
              return;
            }

            waitUntil(
              sendEmail({
                email: identifier,
                subject: `Your ${process.env.NEXT_PUBLIC_APP_NAME} Login Link`,
                template: CUSTOMER_IO_TEMPLATES.MAGIC_LINK,
                messageData: {
                  url,
                },
                customerId: user?.id,
              }),
            );
          });
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
            source: true,
            paymentData: true,
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
          source: user.source,
          paymentData: user.paymentData,
        };
      },
    }),
  ],
  // @ts-ignore
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        // domain: VERCEL_DEPLOYMENT
        //   ? `.${APP_URL}`
        //   : undefined,
        domain: VERCEL_DEPLOYMENT ? `.vercel.app` : undefined,
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

        // don't allow account linking for non-existing users
        if (!userExists) {
          return false;
        }

        if (!profile) {
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

      // refresh the user's data if they update their name / email or session update is triggered
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
      const cookieStore = cookies();

      const { user: userFromCookie } = await getUserCookieService();

      const customerUser = convertSessionUserToCustomerBody(
        message.user as Session["user"],
      );

      await applyUserSession({
        ...customerUser,
        currency: { ...customerUser?.currency, ...userFromCookie?.currency },
      });

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
        // only send the welcome email if the user was created in the last 15s
        // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
        if (
          user.createdAt &&
          new Date(user.createdAt).getTime() > Date.now() - 15000
          // process.env.NEXT_PUBLIC_IS_DUB
        ) {
          if (message?.account?.provider === "google") {
          }
        }
      } else {
        const hasOauthFlowCookie = !!cookieStore.get(ECookieArg.OAUTH_FLOW)
          ?.value;

        if (!hasOauthFlowCookie) {
          if (
            message?.account?.provider === "google" ||
            message?.account?.provider === "email"
          ) {
            const { id, email } = message.user;

            cookieStore.set(
              ECookieArg.OAUTH_FLOW,
              JSON.stringify({
                flow: "login",
                provider: message?.account?.provider,
                email,
                userId: id,
              }),
              {
                httpOnly: true,
                maxAge: 20,
              },
            );
          }
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
