import { detectBot } from "@/lib/middleware/utils/detect-bot";
import { tb } from "@/lib/tinybird/client";
import { getDomainWithoutWWW } from "@dub/utils";
import * as z from "zod/v4";

const applicationEventSchemaTB = z.object({
  timestamp: z.string(),
  application_id: z.string(),
  partner_id: z.string().default(""),
  program_id: z.string().default(""),
  event_name: z.string(),
  source: z.string().default(""),
  url: z.string(),
  referer: z.string(),
  bot: z.number().default(0),
  qr: z.number().default(0),
});

export const ingestApplicationEvent = tb.buildIngestEndpoint({
  datasource: "dub_application_events",
  event: applicationEventSchemaTB,
  wait: true,
});

const recordApplicationEventParamsSchema = z.object({
  applicationId: z.string(),
  eventName: z.string(),
  partnerId: z.string().nullish(),
  source: z.string().nullish(),
  programId: z.string().nullish(),
  req: z.custom<Request>().optional(),
  url: z.string().optional(),
  referer: z.string().optional(),
  bot: z.number().optional(),
  qr: z.number().optional(),
});

export type RecordApplicationEventParams = z.infer<
  typeof recordApplicationEventParamsSchema
>;

export async function recordApplicationEvent(
  params: RecordApplicationEventParams,
) {
  const {
    applicationId,
    programId,
    partnerId,
    eventName,
    source,
    req,
    url,
    referer,
    bot,
    qr,
  } = params;

  const refererHeader = req?.headers?.get("referer");
  const pathname =
    req != null
      ? new URL(req.url).pathname
      : url != null && url !== ""
        ? (() => {
            try {
              return new URL(url, "https://dub.co").pathname;
            } catch {
              return "/";
            }
          })()
        : "/";
  const finalRefererRaw = referer ?? refererHeader ?? "";
  const finalReferer = finalRefererRaw
    ? getDomainWithoutWWW(finalRefererRaw) || "(direct)"
    : "(direct)";
  const finalBot = req ? (detectBot(req) ? 1 : 0) : bot ?? 0;
  const finalQr = qr ?? 0;

  await ingestApplicationEvent({
    timestamp: new Date(Date.now()).toISOString(),
    application_id: applicationId,
    event_name: eventName,
    partner_id: partnerId ?? "",
    source: source ?? "",
    program_id: programId ?? "",
    url: pathname,
    referer: finalReferer,
    bot: finalBot,
    qr: finalQr,
  });
}
