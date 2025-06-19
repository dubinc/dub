This guide will show you how to integrate Dub Analytics with your Better Auth application.

### Step 1: Install package

Using the package manager of your choice, add the `@dub/analytics` to your project.

```bash
npm install @dub/analytics
```

### Step 2: Initialize package in your code

If you are using a React framework with Better Auth, you can use the `<Analytics />` component to track conversions on your website.

E.g. if you're using Next.js with Better Auth, you can add the `<Analytics />` component to your root layout component or any other pages where you want to track conversions.

You will also need to set up the `domainsConfig.refer` property to enable client-side click-tracking.

```jsx
import { Analytics as DubAnalytics } from '@dub/analytics/react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
      <DubAnalytics domainsConfig={{
        refer: "yourcompany.link"
      }} />
    </html>
  );
}
```

### Step 3: Track authentication events

You can track authentication events by calling the `track` function from the Dub Analytics package:

```jsx
import { track } from '@dub/analytics';

// Track user sign up
track('user_signed_up', {
  userId: user.id,
  email: user.email,
  provider: 'better-auth'
});

// Track user sign in
track('user_signed_in', {
  userId: user.id,
  email: user.email,
  provider: 'better-auth'
});
```

### Step 4: Integration with Better Auth hooks

If you're using Better Auth's React hooks, you can integrate tracking directly into your authentication flow:

```jsx
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
