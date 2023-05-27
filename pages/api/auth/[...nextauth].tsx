import { PrismaAdapter } from "@next-auth/prisma-adapter";
import sendMail, { sendMarketingMail } from "emails";
import LoginLink from "emails/LoginLink";
import WelcomeEmail from "emails/WelcomeEmail";
import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { isBlacklistedEmail } from "@/lib/utils";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      sendVerificationRequest({ identifier, url }) {
        sendMail({
          subject: "Your Dub.sh Login Link",
          to: identifier,
          component: <LoginLink url={url} />,
        });
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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
        domain: VERCEL_DEPLOYMENT ? ".dub.sh" : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  pages: {
    newUser: "/welcome",
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (!user.email || (await isBlacklistedEmail(user.email))) {
        return false;
      }
      if (account?.provider === "google") {
        // update the user entry with the name and image
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: profile?.name,
            // @ts-ignore - this is a bug in the types, `picture` is a valid on the `Profile` type
            image: profile?.picture,
          },
        });
      }
      return true;
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (!token.email || (await isBlacklistedEmail(token.email))) {
        return {};
      }
      if (user) {
        token.user = user;
      }
      if (trigger === "update") {
        const refreshedUser = await prisma.user.findUnique({
          where: { id: token.sub },
        });
        token.user = refreshedUser;
        token.name = refreshedUser?.name;
        token.email = refreshedUser?.email;
        token.image = refreshedUser?.image;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        // @ts-ignore
        id: token.sub,
        ...session.user,
      };
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message.isNewUser) {
        const email = message.user.email as string;
        await sendMarketingMail({
          subject: "✨ Welcome to Dub",
          to: email,
          component: <WelcomeEmail />,
        });
      }
    },
  },
};

export default NextAuth(authOptions);
