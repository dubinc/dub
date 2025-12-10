import { withCron } from "@/lib/cron/with-cron";
import { z } from "zod";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  pathname: z.enum(["/api/track/lead", "/api/track/sale", "/api/links"]),
  method: z.enum(["POST"]),
  body: z.any(),
});

// POST /api/cron/retry-failed-request
export const POST = withCron(async ({ rawBody }) => {
  const { pathname, method, body } = schema.parse(JSON.parse(rawBody));

  if (pathname === "/api/links") {
    //
  } else if (pathname === "/api/track/lead") {
    //
  } else if (pathname === "/api/track/sale") {
    //
  }

  return logAndRespond(`Failed request for ${method} ${pathname} processed.`);
});
