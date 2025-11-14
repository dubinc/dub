import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";

export const linkDomainUpdateSchema = z.object({
  newDomain: z.string(),
  oldDomain: z.string(),
  programId: z.string().optional().describe("Only update program's links."),
  startingAfter: z.string().optional(),
});

interface QueueDomainUpdateProps
  extends z.infer<typeof linkDomainUpdateSchema> {
  delay?: number;
}

export async function queueDomainUpdate({
  oldDomain,
  newDomain,
  programId,
  startingAfter,
  delay,
}: QueueDomainUpdateProps) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/update`,
    ...(delay && { delay }),
    body: {
      oldDomain,
      newDomain,
      ...(programId && { programId }),
      ...(startingAfter && { startingAfter }),
    },
  });
}

export async function queueDomainDeletion({
  domain,
  delay,
}: {
  domain: string;
  delay?: number;
}) {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/domains/delete`,
    ...(delay && { delay }),
    body: {
      domain,
    },
  });
}
