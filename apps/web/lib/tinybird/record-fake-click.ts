import { Link } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import { clickEventSchemaTB } from "../zod/schemas/clicks";
import { recordClick } from "./record-click";

// TODO:
// Use this in other places where we need to record a fake click event (Eg: import-customers)
export async function recordFakeClick({
  link,
  customer,
  timestamp,
}: {
  link: Pick<Link, "id" | "url" | "domain" | "key" | "projectId">;
  customer?: {
    country?: string | null;
    region?: string | null;
    continent?: string | null;
  };
  timestamp?: string | number;
}) {
  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": customer?.country || "US",
      "x-vercel-ip-country-region": customer?.region || "CA",
      "x-vercel-ip-continent": customer?.continent || "NA",
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    clickId: nanoid(16),
    workspaceId: link.projectId!,
    linkId: link.id,
    domain: link.domain,
    key: link.key,
    url: link.url,
    skipRatelimit: true,
    shouldCacheClickId: true,
    ...(timestamp && { timestamp: new Date(timestamp).toISOString() }),
  });

  if (!clickData) {
    throw new Error("Failed to record fake click.");
  }

  return clickEventSchemaTB.parse({
    ...clickData,
    timestamp: clickData.timestamp.replace("T", " ").replace("Z", ""),
    bot: 0,
    qr: 0,
  });
}
