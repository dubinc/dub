import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { getSession } from "@/lib/auth";
import { setServerAuthSession } from "@/lib/auth/jwt-signin";
import { cookies } from "next/headers";

/**
 * Debug endpoint to understand what's happening with authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    console.log("🔍 Starting debug for userId:", userId);

    // Step 1: Create the session
    console.log("🔍 Step 1: Creating session...");
    await setServerAuthSession(userId);
    
    // Step 2: Check cookies
    console.log("🔍 Step 2: Checking cookies...");
    const cookieStore = cookies();
    const isSecure = !!process.env.VERCEL_URL;
    const cookieName = `${isSecure ? "__Secure-" : ""}next-auth.session-token`;
    const sessionCookie = cookieStore.get(cookieName);
    
    console.log("🔍 Cookie name:", cookieName);
    console.log("🔍 Cookie exists:", !!sessionCookie);
    console.log("🔍 Cookie value length:", sessionCookie?.value?.length || 0);

    // Step 3: Try to decode the JWT manually
    let decodedToken = null;
    if (sessionCookie?.value) {
      try {
        decodedToken = await decode({
          token: sessionCookie.value,
          secret: process.env.NEXTAUTH_SECRET || '',
        });
        console.log("🔍 JWT decoded successfully:", !!decodedToken);
        console.log("🔍 JWT payload:", JSON.stringify(decodedToken, null, 2));
      } catch (error) {
        console.log("🔍 JWT decode error:", error);
      }
    }

    // Step 4: Check NextAuth session
    console.log("🔍 Step 4: Checking NextAuth session...");
    const session = await getSession();
    console.log("🔍 NextAuth session exists:", !!session);
    console.log("🔍 NextAuth session:", session ? {
      userId: session.user?.id,
      email: session.user?.email,
      name: session.user?.name,
    } : null);

    return NextResponse.json({
      success: true,
      debug: {
        cookieName,
        cookieExists: !!sessionCookie,
        cookieLength: sessionCookie?.value?.length || 0,
        tokenDecoded: !!decodedToken,
        decodedPayload: decodedToken,
        sessionExists: !!session,
        session: session ? {
          userId: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
        } : null,
      }
    });

  } catch (error) {
    console.error("🔍 Debug error:", error);
    return NextResponse.json(
      { 
        error: "Debug failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug-auth - Check current auth state
 */
export async function GET() {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const isSecure = !!process.env.VERCEL_URL;
    const cookieName = `${isSecure ? "__Secure-" : ""}next-auth.session-token`;
    const sessionCookie = cookieStore.get(cookieName);

    return NextResponse.json({
      session: session ? {
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      } : null,
      cookie: {
        name: cookieName,
        exists: !!sessionCookie,
        length: sessionCookie?.value?.length || 0,
      },
      env: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        isSecure,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Check failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
