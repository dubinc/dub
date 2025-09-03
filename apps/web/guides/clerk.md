Configure Clerk to track lead conversion events when a new user signs up.

## Step 1: Add environment variables

Add the following environment variables to your app:

```bash
# get it here: https://dashboard.clerk.com/apps/new
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

# get it here: https://d.to/tokens
DUB_API_KEY=your_api_key
```

## Step 2: Add a custom claim to your Clerk session token

Add the following JSON as a [custom claim](https://clerk.com/docs/references/nextjs/add-onboarding-flow#add-custom-claims-to-your-session-token) to your Clerk session token:

```json
{
  "metadata": "{{user.public_metadata}}"
}
```

## Step 3: Extend the `@dub/analytics` package with Clerk's `useUser` hook

Extend the `@dub/analytics` package to include a `trackLead` server action.

```javascript
"use client";

import { trackLead } from "@/actions/track-lead";
import { useUser } from "@clerk/nextjs";
import { Analytics, AnalyticsProps } from "@dub/analytics/react";
import { useEffect } from "react";

export function DubAnalytics(props: AnalyticsProps) {
  const { user } = useUser();

  useEffect(() => {
    if (!user || user.publicMetadata.dubClickId) return;

    // if the user is loaded but hasn't been persisted to Dub yet, track the lead event
    trackLead({
      id: user.id,
      name: user.fullName!,
      email: user.primaryEmailAddress?.emailAddress,
      avatar: user.imageUrl,
    }).then(async (res) => {
      if (res.ok) await user.reload();
      else console.error(res.error);
    });

    // you can also use an API route instead of a server action
    /*
      fetch("/api/track-lead", {
        method: "POST",
        body: JSON.stringify({
          id: user.id,
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
          avatar: user.imageUrl,
        }),
      }).then(res => {
        if (res.ok) await user.reload();
        else console.error(res.statusText);
      });
      */
  }, [user]);

  return <Analytics {...props} />;
}
```

Then, add the `DubAnalytics` component to your app's root layout component:

```javascript
import { DubAnalytics } from "@/components/dub-analytics";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <DubAnalytics />
        {children}
      </body>
    </html>
  );
}
```

## Step 4: Implement the `trackLead` server action

On the server side, implement the `trackLead` server action.

```javascript
// This is a server action
"use server";

import { dub } from "@/lib/dub";
import { clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function trackLead({
  id,
  name,
  email,
  avatar,
}: {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
}) {
  try {
    const cookieStore = await cookies();
    const dubId = cookieStore.get("dub_id")?.value;

    if (dubId) {
      // Send lead event to Dub
      await dub.track.lead({
        clickId: dubId,
        eventName: "Sign Up",
        externalId: id,
        customerName: name,
        customerEmail: email,
        customerAvatar: avatar,
      });

      // Delete the dub_id cookie
      cookieStore.set("dub_id", "", {
        expires: new Date(0),
      });
    }

    const clerk = await clerkClient();
    await clerk.users.updateUser(id, {
      publicMetadata: {
        dubClickId: dubId || "n/a",
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Error in trackLead:", error);
    return { ok: false, error: (error as Error).message };
  }
}
```

Alternatively, you can also create an API route instead:

```javascript
// This is an API route
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // read dub_id from the request cookies
  const dubId = req.cookies.get("dub_id")?.value;
  if (dubId) {
    // Send lead event to Dub
    await dub.track.lead({
      clickId: dubId,
      eventName: "Sign Up",
      externalId: id,
      customerName: name,
      customerEmail: email,
      customerAvatar: avatar,
    });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUser(id, {
    publicMetadata: {
      dubClickId: dubId || "n/a",
    },
  });
  const res = NextResponse.json({ ok: true });
  // Delete the dub_id cookie
  res.cookies.set("dub_id", "", {
    expires: new Date(0),
  });
  return res;
}
```
