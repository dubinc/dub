Configure Auth0 to track lead conversion events in the `afterCallback` function.

Here's how it works in a nutshell:

1. In the sign in `afterCallback` function, check if the user is a new sign up.
2. If the user is a new sign up, check if the `dub_id` cookie is present.
3. If the `dub_id` cookie is present, send a lead event to Dub using `dub.track.lead`
4. Delete the `dub_id` cookie.

```javascript
import { handleAuth, handleCallback, type Session } from "@auth0/nextjs-auth0";
import { cookies } from "next/headers";
import { dub } from "@/lib/dub";

const afterCallback = async (req: Request, session: Session) => {
  const userExists = await getUser(session.user.email);

  if (!userExists) {
    createUser(session.user);
    // check if dub_id cookie is present
    const clickId = cookies().get("dub_id")?.value;

    if (clickId) {
      // send lead event to Dub
      await dub.track.lead({
        clickId,
        eventName: "Sign Up",
        externalId: session.user.id,
        customerName: session.user.name,
        customerEmail: session.user.email,
        customerAvatar: session.user.image,
      });

      // delete the dub_id cookie
      cookies().set("dub_id", "", {
        expires: new Date(0),
      });
    }
    return session;
  }
};

export default handleAuth({
  callback: handleCallback({ afterCallback }),
});
```
