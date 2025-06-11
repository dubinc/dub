// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://96bf4ee91ebbd2d6176421aee6927df7@o4507182437367808.ingest.us.sentry.io/4507182441299968",

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
