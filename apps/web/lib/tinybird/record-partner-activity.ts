import { z } from "zod";

export const partnerActivitySchema = z.object({
  program_id: z.string(),
  partner_id: z.string(),
  url: z.string(),
  activity: z.string(),
  timestamp: z.string().optional(),
});

export async function recordPartnerActivity(
  data: z.infer<typeof partnerActivitySchema>,
) {
  const response = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_partner_activities&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date(Date.now()).toISOString(),
      }),
    },
  );

  return response.json();
}
