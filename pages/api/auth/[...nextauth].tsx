import { PrismaAdapter } from "@next-auth/prisma-adapter";
import sendMail, { sendMarketingMail } from "emails";
import LoginLink from "emails/LoginLink";
import WelcomeEmail from "emails/WelcomeEmail";
import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";
import { isBlacklistedEmail } from "@/lib/utils";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;
const googleAuthClient = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
);
const adapter = PrismaAdapter(prisma);

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
    CredentialsProvider({
      // We will use this id later to specify for what Provider we want to trigger the signIn method
      id: "googleonetap",
      name: "google-one-tap",

      // This means that the authentication will be done through a single credential called 'credential'
      credentials: {
        credential: { type: "text" },
      },

      // This function will be called upon signIn
      async authorize(credentials, req) {
        // These next few lines are simply the recommended way to use the Google Auth Javascript API as seen in the Google Auth docs
        // What is going to happen is that t he Google One Tap UI will make an API call to Google and return a token associated with the user account
        // This token is then passed to the authorize function and used to retrieve the customer information (payload).
        // If this doesn't make sense yet, come back to it after having seen the custom hook.

        const token = credentials!.credential;
        const ticket = await googleAuthClient.verifyIdToken({
          idToken: token,
          audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error("Cannot extract payload from signin token");
        }

        const {
          email,
          sub,
          given_name,
          family_name,
          email_verified,
          picture: image,
        } = payload;
        if (!email) {
          throw new Error("Email not available");
        }

        // At this point we have deconstructed the payload and we have all the user's info at our disposal.
        // So first we're going to do a check to see if we already have this user in our DB using the email as identifier.
        let user = await adapter.getUserByEmail(email);

        // If no user is found, then we create one.
        if (!user) {
          user = await adapter.createUser({
            name: [given_name, family_name].join(" "),
            email,
            image,
            emailVerified: email_verified ? new Date() : null,
          });
        }

        // The user may already exist, but maybe it signed up with a different provider. With the next few lines of code
        // we check if the user already had a Google account associated, and if not we create one.
        let account = await adapter.getUserByAccount({
          provider: "google",
          providerAccountId: sub,
        });

        if (!account && user) {
          console.log("creating and linking account");
          await adapter.linkAccount({
            userId: user.id,
            provider: "google",
            providerAccountId: sub,
            type: "credentials",
          });
        }

        // The authorize function must return a user or null
        return user;
      },
    }),
  ],
  adapter,
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
  callbacks: {
    signIn: async ({ user, account, profile }) => {
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
        if (userExists && !userExists.name) {
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: profile?.name,
              // @ts-ignore - this is a bug in the types, `picture` is a valid on the `Profile` type
              image: profile?.picture,
            },
          });
        }
      }
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
      console.log({ url, baseUrl });
      return Promise.resolve("http://app.localhost:3000");
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
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            createdAt: true,
          },
        });
        // only send the welcome email if the user was created in the last 10 seconds
        // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
        if (
          user?.createdAt &&
          new Date(user.createdAt).getTime() > Date.now() - 10000
        ) {
          sendMarketingMail({
            subject: "Welcome to Dub.sh!",
            to: email,
            component: <WelcomeEmail />,
          });
        }
      }
    },
  },
};

export default NextAuth(authOptions);
