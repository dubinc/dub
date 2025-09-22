# Server-Side Authentication Without User Action

This document explains how to programmatically sign in users from the server side without requiring user interaction.

## Overview

The **JWT-based authentication** method directly sets NextAuth session cookies on the server, providing the cleanest and most reliable way to authenticate users programmatically.

## Environment Variables

Add this to your `.env` file:

```bash
# Your existing NextAuth secret (used for JWT signing)
NEXTAUTH_SECRET=your-nextauth-secret
```

## The Simple Method: JWT-based Authentication

### Create Auto-login URL

```typescript
import { createAutoLoginURL } from "@/lib/auth/jwt-signin";

// Create a magic link for automatic login
async function createMagicLink(userId: string, redirectTo: string = "/dashboard") {
  try {
    const loginUrl = await createAutoLoginURL(userId, redirectTo);
    console.log("Magic link:", loginUrl);
    
    // Send this URL via email, SMS, or any other method
    return loginUrl;
  } catch (error) {
    console.error("Failed to create magic link:", error);
  }
}
```

### Direct Session Creation

```typescript
import { setServerAuthSession } from "@/lib/auth/jwt-signin";

// Directly set user session (useful in middleware or API routes)
async function authenticateUserDirectly(userId: string) {
  try {
    await setServerAuthSession(userId);
    console.log("User session created successfully");
  } catch (error) {
    console.error("Failed to create session:", error);
  }
}
```

## Using the Auto-login Endpoint

```typescript
// POST to auto-login endpoint
async function autoLoginViaAPI(jwtToken: string) {
  const response = await fetch("/api/auth/auto-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: jwtToken,
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log("Auto-login successful:", result.user);
  } else {
    console.error("Auto-login failed:", result.error);
  }
}
```

## Complete Examples

### Example 1: Webhook Handler

```typescript
// app/api/webhooks/user-created/route.ts
import { setServerAuthSession } from "@/lib/auth/jwt-signin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId, email } = await req.json();
  
  // Verify webhook signature here...
  
  try {
    // Automatically sign in the newly created user
    await setServerAuthSession(userId);
    
    return NextResponse.json({ 
      success: true, 
      message: "User created and signed in" 
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to authenticate user" }, 
      { status: 500 }
    );
  }
}
```

### Example 2: Admin Panel

```typescript
// app/api/admin/impersonate/route.ts
import { setServerAuthSession } from "@/lib/auth/jwt-signin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Check if current user is admin
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const { targetUserId } = await req.json();
  
  try {
    // Admin can impersonate any user
    await setServerAuthSession(targetUserId);
    
    return Response.json({ 
      success: true, 
      message: `Now impersonating user ${targetUserId}` 
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to impersonate user" }, 
      { status: 500 }
    );
  }
}
```

### Example 3: Migration Script

```typescript
// scripts/migrate-users.ts
import { createAutoLoginURL } from "@/lib/auth/jwt-signin";
import { prisma } from "@dub/prisma";
import { sendEmail } from "@dub/email";

async function migrateUsersAndSendLoginLinks() {
  const users = await prisma.user.findMany({
    where: { needsMigration: true },
    select: { id: true, email: true, name: true }
  });

  for (const user of users) {
    try {
      // Create auto-login URL
      const loginUrl = await createAutoLoginURL(user.id, "/migration-complete");
      
      // Send email with magic link
      await sendEmail({
        email: user.email,
        subject: "Complete Your Account Migration",
        template: "migration-complete",
        messageData: {
          name: user.name,
          loginUrl: loginUrl,
        },
      });

      console.log(`Sent migration email to ${user.email}`);
    } catch (error) {
      console.error(`Failed to process user ${user.id}:`, error);
    }
  }
}
```

## Security Considerations

1. **Server Token**: Keep `NEXTAUTH_SERVER_TOKEN` secret and rotate it regularly
2. **Rate Limiting**: All endpoints include rate limiting to prevent abuse
3. **JWT Expiration**: Auto-login tokens expire after 30 days
4. **IP Tracking**: Consider logging IP addresses for audit trails
5. **Environment**: Never expose server tokens on client-side

## Error Handling

All methods include comprehensive error handling:

- User not found
- Invalid tokens
- Rate limiting
- Database errors
- JWT verification failures

## Testing

```typescript
// Test server authentication
describe("Server Authentication", () => {
  it("should authenticate user with server token", async () => {
    const result = await serverSignIn("user_123");
    expect(result.success).toBe(true);
  });

  it("should create valid auto-login URL", async () => {
    const url = await createAutoLoginURL("user_123");
    expect(url).toContain("/api/auth/auto-login");
  });
});
```

This implementation provides flexible, secure ways to authenticate users programmatically while maintaining compatibility with your existing NextAuth.js setup.

