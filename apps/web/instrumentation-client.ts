// This file configures the initialization of Sentry on the client.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
