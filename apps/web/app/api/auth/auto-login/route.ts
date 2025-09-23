import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuthJWT, setServerAuthSession } from "@/lib/auth/jwt-signin";
import { ratelimit } from "@/lib/upstash";

/**
 * GET /api/auth/auto-login?token=<jwt>&redirect=<url>
 * 
 * Auto-login endpoint that accepts a JWT token and automatically signs in the user.
 * This provides a way to create "magic links" for server-side authentication.
 * 
 * Query Parameters:
 * - token: JWT token created by createServerAuthJWT
 * - redirect: URL to redirect to after successful login (optional, defaults to "/")
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const redirectUrl = url.searchParams.get("redirect") || "/";

    if (!token) {
      return NextResponse.json(
        { error: "Token parameter is required" },
        { status: 400 }
      );
    }

    // Rate limiting for security
    const { success } = await ratelimit(5, "1 m").limit(
      `auto-login:${req.ip || "unknown"}`,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Verify the JWT token
    const session = await verifyServerAuthJWT(token);
    
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await setServerAuthSession(session.user.id);

    // Redirect to the specified URL
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    console.error("Auto-login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/auto-login
 * 
 * Alternative endpoint for programmatic auto-login that returns JSON instead of redirecting.
 * 
 * Body:
 * {
 *   "token": "jwt-token-here"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Rate limiting for security
    const { success } = await ratelimit(10, "1 m").limit(
      `auto-login-post:${req.ip || "unknown"}`,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Verify the JWT token
    const session = await verifyServerAuthJWT(token);
    
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await setServerAuthSession(session.user.id);

    return NextResponse.json({
      success: true,
      user: session.user,
      message: "User signed in successfully",
    });
  } catch (error) {
    console.error("Auto-login POST error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

