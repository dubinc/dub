import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@dub/prisma";
import { cookies } from "next/headers";
import { Session } from "./utils";

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
        image: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const jwt = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
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

    if (!payload.serverAuth) {
      return null; // Not a server-authenticated token
    }

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        image: payload.image as string,
        isMachine: false,
      },
    };
  } catch (error) {
    console.error("Verify server auth JWT error:", error);
    return null;
  }
}

/**
 * Set server authentication session using cookies
 * This method directly sets the NextAuth session cookie
 */
export async function setServerAuthSession(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create a NextAuth-compatible JWT
    const sessionToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    const cookieStore = cookies();
    const isSecure = process.env.NODE_ENV === "production";
    
    // Set the NextAuth session token cookie
    cookieStore.set(
      `${isSecure ? "__Secure-" : ""}next-auth.session-token`,
      sessionToken,
      {
        httpOnly: true,
        secure: isSecure,
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

