Configure Appwrite to track lead conversion events during the sign up process.

## Step 1

Head to [Appwrite Cloud](https://apwr.dev/appwrite-dub) and create a new project.

![New project on Appwrite Cloud](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/appwrite/appwrite-new-project.png)

Create a new API key with the `sessions.write` scope enabled and save the API key for later use. You can also copy your project ID and endpoint from the project's Settings page.

![API key in your project on Appwrite Cloud](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/appwrite/appwrite-api-key.png)

Then, in your Next.js app, install the Appwrite Node.js SDK.

```bash
npm i node-appwrite
```

## Step 2

Add the following environment variables to your app.

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT=<APPWRITE_PROJECT_ID>
NEXT_APPWRITE_KEY=<APPWRITE_API_KEY>
NEXT_DUB_API_KEY=<DUB_API_KEY>
```

## Step 3

Add the `DubAnalytics` component from the `@dub/analytics` package to your app's root layout.

```javascript
import type { Metadata } from "next";
import { Analytics as DubAnalytics } from "@dub/analytics/react";

export const metadata: Metadata = {
  title: "Appwrite Dub Leads Example",
  description: "Appwrite Dub Leads Tracking example app with Next.js",
};

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

## Step 4

Create the Appwrite Session and Admin client (necessary for SSR apps, as explained in the [Appwrite docs](https://appwrite.io/docs/products/auth/server-side-rendering)). Additionally, create a function to verify user login.

```javascript
"use server";
import { Client, Account } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT as string);

  const session = (await cookies()).get("my-custom-session");
  if (!session || !session.value) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT as string)
    .setKey(process.env.NEXT_APPWRITE_KEY as string);

  return {
    get account() {
      return new Account(client);
    },
  };
}
```

## Step 5

Create the Dub client and send leads to Dub using the `dub.track.lead()` function.

```javascript
import type { Models } from "node-appwrite";
import { Dub } from "dub";

const dub = new Dub({
  token: process.env.NEXT_DUB_API_KEY,
});

export function addDubLead(
  user: Models.User<Models.Preferences>,
  dub_id: string,
) {
  dub.track.lead({
    clickId: dub_id,
    eventName: "Sign Up",
    externalId: user.$id,
    customerName: user.name,
    customerEmail: user.email,
  });
}
```

## Step 6

In the `/auth` page, use the Appwrite Admin client to allow users to sign up. Post sign up, check if the `dub_id` cookie is present, send a lead event to Dub if found, and delete the `dub_id` cookie.

```javascript
import { ID } from "node-appwrite";
import { createAdminClient, getLoggedInUser } from "@/lib/server/appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { addDubLead } from "@/lib/server/dub";

async function signUpWithEmail(formData: any) {
  "use server";

  // Get sign up info from form
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");

  // Create account and session using Appwrite
  const { account } = await createAdminClient();

  const user = await account.create(ID.unique(), email, password, name);
  const session = await account.createEmailPasswordSession(email, password);

  (await cookies()).set("my-custom-session", session.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  // Check if Dub ID is present in cookies and track lead if found
  const dub_id = (await cookies()).get("dub_id")?.value;
  if (dub_id) {
    addDubLead(user, dub_id);
    (await cookies()).delete("dub_id");
  }

  // Redirect to success page
  redirect("/auth/success");
}

export default async function SignUpPage() {
  // Verify active user session and redirect to success page if found
  const user = await getLoggedInUser();
  if (user) redirect("/auth/success");

  return (
    <>
      <form action={signUpWithEmail}>
        <input
          id="email"
          name="email"
          placeholder="Email"
          type="email"
          required
        />
        <input
          id="password"
          name="password"
          placeholder="Password"
          minLength={8}
          type="password"
          required
        />
        <input id="name" name="name" placeholder="Name" type="text" required />
        <button type="submit">Sign up</button>
      </form>
    </>
  );
}
```
