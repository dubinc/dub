This quick start guide will show you how to get started with Dub Analytics on your website.

### Step 1: Install package

Using the package manager of your choice, add the `@dub/analytics` package to your project.

```bash
npm install @dub/analytics
```

### Step 2: Initialize package in your code

If you are using a React framework, you can use the `<Analytics />` component to track conversions on your website.

E.g. if you're using Next.js, you can add the `<Analytics />` component to your root layout component or any other pages where you want to track conversions.

You will also need to set the [`domainsConfig.refer` property](https://dub.co/docs/sdks/client-side/installation-guides/react#param-domains-config) to the short link domain you're using on Dub to enable [client-side click-tracking](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking).

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
