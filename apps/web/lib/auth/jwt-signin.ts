import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@dub/prisma";
import { cookies } from "next/headers";
import { Session } from "./utils";

// JWT secret for magic links
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret";
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Create a server-side authentication JWT for magic links
 * This is only used for the auto-login URL functionality
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
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours for magic links
      serverAuth: true, // Mark as server-authenticated
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error("Create server auth JWT error:", error);
    throw error;
  }
}

/**
 * Verify and decode a server-side authentication JWT (for magic links)
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
 * Set server authentication session using NextAuth's database session approach
 * This creates a session record that NextAuth will recognize and convert to JWT
 */
export async function setServerAuthSession(userId: string): Promise<string> {
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

    // Generate a session token (this is what NextAuth does internally)
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create a session record in the database (NextAuth will recognize this)
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpiry,
      },
    });

    const cookieStore = cookies();
    const isSecure = process.env.NODE_ENV === "production";
    
    // Set the session token cookie (NextAuth will read this and create the JWT)
    cookieStore.set(
      `${isSecure ? "__Secure-" : ""}next-auth.session-token`,
      sessionToken,
      {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        domain: isSecure ? ".getqr.com" : undefined,
        expires: sessionExpiry,
      }
    );

    return sessionToken;
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

