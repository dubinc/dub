Configure Better Auth to track lead conversion events when a new user signs up.

## Step 1: Install the @dub/better-auth plugin

To get started, simply install the [`@dub/better-auth` plugin](https://www.npmjs.com/package/@dub/better-auth) via your preferred package manager:

```bash
npm install @dub/better-auth
yarn add @dub/better-auth
pnpm add @dub/better-auth
bun add @dub/better-auth
```

## Step 2: Configure the plugin

Then, add the plugin to your better-auth config file:

```ts auth.ts
import { dubAnalytics } from "@dub/better-auth";
import { betterAuth } from "better-auth";
import { Dub } from "dub";

const dub = new Dub();

export const auth = betterAuth({
  plugins: [
    dubAnalytics({
      dubClient: dub,
    }),
  ],
});
```
