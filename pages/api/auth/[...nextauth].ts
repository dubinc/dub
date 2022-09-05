import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { UpstashRedisAdapter } from "@next-auth/upstash-redis-adapter";
import { redis } from "@/lib/redis";

const useSecureCookies = !!process.env.VERCEL_URL;

export default NextAuth({
  adapter: UpstashRedisAdapter(redis),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: ".dub.sh",
        secure: useSecureCookies,
      },
    },
  },
});
