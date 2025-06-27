Configure NextAuth to track lead conversion events when a new user signs up.

1. Use NextAuth's [`signIn` event](https://next-auth.js.org/configuration/events#signin) to detect when there's a new sign up.
2. If the user is a new sign up, check if the `dub_id` cookie is present.
3. If the `dub_id` cookie is present, send a lead event to Dub using `dub.track.lead`
4. Delete the `dub_id` cookie.

Under the hood, Dub records the user as a customer and associates them with the click event that they came from. The user's unique ID is now the source of truth for all future events – hence why we don't need the `dub_id` cookie anymore.

```javascript
// app/api/auth/[...nextauth]/options.ts
import type { NextAuthOptions } from "next-auth";
import { cookies } from "next/headers";
import { dub } from "@/lib/dub";

export const authOptions: NextAuthOptions = {
  ...otherAuthOptions, // your other NextAuth options
  events: {
    async signIn(message) {
      // if it's a new sign up
      if (message.isNewUser) {
        // check if dub_id cookie is present
        const dub_id = cookies().get("dub_id")?.value;

        if (dub_id) {
          // send lead event to Dub
          await dub.track.lead({
            clickId: dub_id,
            eventName: "Sign Up",
            externalId: user.id,
            customerName: user.name,
            customerEmail: user.email,
            customerAvatar: user.image,
          });

          // delete the dub_id cookie
          cookies().set("dub_id", "", {
            expires: new Date(0),
          });
        }
      }
    },
  },
};
```
