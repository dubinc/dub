import z from "../zod";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const schema = z.object({
  link: z.string(),
});

export const refreshComplianceFlow = async ({
  dotsAppId,
}: {
  dotsAppId: string;
}) => {
  const response = await fetch(
    `${DOTS_API_URL}/apps/${dotsAppId}/compliance-flow`,
    {
      method: "POST",
      headers: dotsHeaders(),
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to refresh compliance flow for ${dotsAppId}.`);
  }

  return schema.parse(await response.json());
};
