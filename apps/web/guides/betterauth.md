Configure Better Auth to track lead conversion events when a new user signs up.

## Step 1: Track authentication events

You can track authentication events by calling the `track` function from the Dub Analytics package:

```javascript 
import { track } from "@dub/analytics";

// Track user sign up
track("user_signed_up", {
  userId: user.id,
  email: user.email,
  provider: "better-auth",
});

// Track user sign in
track("user_signed_in", {
  userId: user.id,
  email: user.email,
  provider: "better-auth",
});
```

## Step 2: Integration with Better Auth hooks

If you're using Better Auth's React hooks, you can integrate tracking directly into your authentication flow:

```javascript
import { useAuth } from 'better-auth/react';
import { track } from '@dub/analytics';

function AuthComponent() {
  const { user, signIn, signUp } = useAuth();

  const handleSignIn = async (credentials) => {
    const result = await signIn(credentials);
    if (result.success) {
      track('user_signed_in', {
        userId: result.user.id,
        email: result.user.email,
        provider: 'better-auth'
      });
    }
  };

  const handleSignUp = async (credentials) => {
    const result = await signUp(credentials);
    if (result.success) {
      track('user_signed_up', {
        userId: result.user.id,
        email: result.user.email,
        provider: 'better-auth'
      });
    }
  };

  return (
    // Your auth UI components
  );
}
```

Read the [client-side click-tracking guide](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking) for more information.
