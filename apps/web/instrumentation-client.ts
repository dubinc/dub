// This file configures the initialization of Sentry on the client.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://96bf4ee91ebbd2d6176421aee6927df7@o4507182437367808.ingest.us.sentry.io/4507182441299968",
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
