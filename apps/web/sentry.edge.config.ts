// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://96bf4ee91ebbd2d6176421aee6927df7@o4507182437367808.ingest.us.sentry.io/4507182441299968",
  debug: false,
});
