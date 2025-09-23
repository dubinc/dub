import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@dub/prisma";
import { cookies } from "next/headers";
import { Session } from "./utils";
import { encode } from "next-auth/jwt";

// JWT secret for server-side authentication
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret";
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Create a server-side authentication JWT for a user
 * This can be used to authenticate API requests without going through the normal OAuth flow
 */
export async function createServerAuthJWT(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const jwt = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      serverAuth: true, // Mark as server-authenticated
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error("Create server auth JWT error:", error);
    throw error;
  }
}

/**
 * Verify and decode a server-side authentication JWT
 */
export async function verifyServerAuthJWT(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Handle both server-auth tokens and NextAuth-compatible tokens
    if (payload.serverAuth) {
      // Custom server-auth token format
      return {
        user: {
          id: payload.sub as string,
          email: payload.email as string,
          name: payload.name as string,
          isMachine: false,
        },
      };
    } else if (payload.user) {
      // NextAuth-compatible token format
      return {
        user: payload.user as Session["user"],
      };
    }

    return null;
  } catch (error) {
    console.error("Verify server auth JWT error:", error);
    return null;
  }
}

/**
 * Set server authentication session using cookies
 * This method directly sets the NextAuth session cookie with the proper format
 */
export async function setServerAuthSession(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const nextAuthToken = await encode({
      token: {
        sub: user.id,
        user,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
      secret: process.env.NEXTAUTH_SECRET || '',
    });

    const cookieStore = cookies();
    const isSecure = !!process.env.VERCEL_URL;

    console.log("nextAuthToken", nextAuthToken);
    console.log("user", user);
    
    // Set the NextAuth session token cookie
    cookieStore.set(
      `${isSecure ? "__Secure-" : ""}next-auth.session-token`,
      nextAuthToken,
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain: isSecure ? ".getqr.com" : undefined,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    );
  } catch (error) {
    console.error("Set server auth session error:", error);
    throw error;
  }
}

/**
 * Create a login URL that will automatically sign in a user
 * This generates a magic link that bypasses normal authentication
 */
export async function createAutoLoginURL(
  userId: string,
  redirectUrl: string = "/"
): Promise<string> {
  try {
    const token = await createServerAuthJWT(userId);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:8888";
    
    return `${baseUrl}/api/auth/auto-login?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectUrl)}`;
  } catch (error) {
    console.error("Create auto login URL error:", error);
    throw error;
  }
}

