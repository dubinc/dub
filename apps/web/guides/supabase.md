Configure Supabase to track lead conversion events in the auth callback function.

Here's how it works in a nutshell:

1. In the `/api/auth/callback` route, check if:
   - the `dub_id` cookie is present.
   - the user is a new sign up (created in the last 10 minutes).
2. If the `dub_id` cookie is present and the user is a new sign up, send a lead event to Dub using `dub.track.lead`
3. Delete the `dub_id` cookie.

```javascript
// app/api/auth/callback/route.ts
import { dub } from "@/lib/dub";
import { createClient } from "@/lib/supabase/server";
import { waitUntil } from "@vercel/functions";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient(cookies());
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { user } = data;
      const dub_id = cookies().get("dub_id")?.value;
      // if the user is created in the last 10 minutes, consider them new
      const isNewUser =
        new Date(user.created_at) > new Date(Date.now() - 10 * 60 * 1000);
      // if the user is new and has a dub_id cookie, track the lead

      if (dub_id && isNewUser) {
        waitUntil(
          dub.track.lead({
            clickId: dub_id,
            eventName: "Sign Up",
            externalId: user.id,
            customerName: user.user_metadata.name,
            customerEmail: user.email,
            customerAvatar: user.user_metadata.avatar_url,
          }),
        );

        // delete the clickId cookie
        cookies().delete("dub_id");
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
```
