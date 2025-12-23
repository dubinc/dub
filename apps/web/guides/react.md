This quick start guide will show you how to get started with Dub on your React website.

### Step 1: Install package

Using the package manager of your choice, add the `@dub/analytics` package to your project.

```bash
npm install @dub/analytics
```

### Step 2: Initialize package in your code

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
