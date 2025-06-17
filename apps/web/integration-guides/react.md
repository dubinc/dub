This quick start guide will show you how to get started with Dub Analytics on your website.

## Step 1: Install package

```bash
npm install @dub/analytics
```

## Step 2: Initialize package in your code

If you are using a React framework, you can use the `<Analytics />` component to track conversions on your website.

E.g. if you're using Next.js, you can add the `<Analytics />` component to your root layout component or any other pages where you want to track conversions.

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
      <DubAnalytics />
    </html>
  );
}
```

## Step 3: Set up client-side click tracking

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

Read the [client-side click-tracking guide](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking) for more information.
