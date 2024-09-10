import z from "../zod";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

const complianceFlowSchema = z.object({
  link: z.string(),
});

export const generateDotsKYBComplianceFlow = async ({
  appId,
}: {
  appId: string;
}) => {
  const { DOTS_API_URL } = getDotsEnv();

  const response = await fetch(
    `${DOTS_API_URL}/apps/${appId}/compliance-flow`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${getEncodedCredentials()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to generate Dots KYB compliance flow URL.");
  }

  return complianceFlowSchema.parse(await response.json());
};