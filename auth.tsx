import NextAuth from "@auth/nextjs";
import authConfig from "auth.config";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

import sendMail, { sendMarketingMail } from "emails";
import WelcomeEmail from "emails/WelcomeEmail";
import LoginLink from "emails/LoginLink";

import { isBlacklistedEmail } from "@/lib/utils";

export const {
  auth,
  handlers: { GET, POST },
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // @ts-expect-error
    {
      id: "email",
      type: "email",
      sendVerificationRequest({ identifier: to, url }) {
        sendMail({
          subject: "Your Dub.sh Login Link",
          to,
          component: <LoginLink url={url} />,
        });
      },
    },
    ...authConfig.providers,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!user.email || (await isBlacklistedEmail(user.email))) {
        return false;
      }
      if (account?.provider === "google") {
        const userExists = await prisma.user.findUnique({
          where: { email: user.email },
          select: { name: true },
        });
        // if the user already exists via email,
        // update the user with their name and image from Google
        if (userExists && !userExists.name && profile) {
          await prisma.user.update({
            where: { email: user.email },
            data: { name: profile.name, image: profile.picture },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn") token.user = user;
      else if (trigger === "update") {
        token.user = await prisma.user.findUnique({ where: { id: token.sub } });
      }
      return token;
    },
  },
  events: {
    async signIn(message) {
      if (!message.isNewUser) return;

      const email = message.user.email as string;
      const user = await prisma.user.findUnique({
        where: { email },
        select: { createdAt: true },
      });
      // only send the welcome email if the user was created in the last 10 seconds
      // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
      if (!user || user.createdAt.valueOf() <= Date.now() - 10000) {
        return;
      }
      sendMarketingMail({
        subject: "Welcome to Dub.sh!",
        to: email,
        component: <WelcomeEmail />,
      });
    },
  },
});
