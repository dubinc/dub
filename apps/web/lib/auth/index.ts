import { isBlacklistedEmail } from "@/lib/edge-config";
import { subscribe } from "@/lib/flodesk";
import prisma from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const config = {
  providers: [
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
  ],
  adapter: PrismaAdapter(prisma),
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
    error: "/login",
    newUser: "/welcome",
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      console.log({ user, account, profile });
      if (!user.email || (await isBlacklistedEmail(user.email))) {
        return false;
      }
      if (account?.provider === "google") {
        const userExists = await prisma.user.findUnique({
          where: { email: user.email },
          select: { name: true, image: true },
        });
        // if the user already exists via email,
        // update the user with their name and image from Google
        if (userExists && profile) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              ...(userExists.name ? {} : { name: profile.name }),
              ...(userExists.image ? {} : { image: profile.picture }),
            },
          });
        }
      } else if (account?.provider === "github") {
        const userExists = await prisma.user.findUnique({
          where: { email: user.email },
          select: { name: true, image: true },
        });
        // if the user already exists via email,
        // update the user with their name and image from Github
        if (userExists && profile) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              ...(!userExists.name && {
                name: (profile.name || profile.login) as string,
              }),
              ...(!userExists.image && { image: profile.avatar_url as string }),
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
        const project = await prisma.project.findUnique({
          where: {
            id: samlProfile.requested.tenant,
          },
        });
        if (project) {
          await Promise.allSettled([
            // add user to project
            prisma.projectUsers.upsert({
              where: {
                userId_projectId: {
                  projectId: project.id,
                  userId: user.id!,
                },
              },
              update: {},
              create: {
                projectId: project.id,
                userId: user.id!,
              },
            }),
            // delete any pending invites for this user
            prisma.projectInvite.delete({
              where: {
                email_projectId: {
                  email: user.email,
                  projectId: project.id,
                },
              },
            }),
          ]);
        }
      }
      return true;
    },
    jwt: async ({ token, user, trigger }) => {
      // force log out banned users
      if (!token.email || (await isBlacklistedEmail(token.email))) {
        return {};
      }

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
            name: true,
            createdAt: true,
          },
        });
        // only send the welcome email if the user was created in the last 10s
        // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
        if (
          user?.createdAt &&
          new Date(user.createdAt).getTime() > Date.now() - 10000 &&
          process.env.NEXT_PUBLIC_IS_DUB
        ) {
          await Promise.allSettled([
            subscribe({ email, name: user.name || undefined }),
            // sendEmail({
            //   subject: "Welcome to Dub.co!",
            //   email,
            //   react: WelcomeEmail({
            //     email,
            //     name: user.name || null,
            //   }),
            //   marketing: true,
            // }),
          ]);
        }
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
