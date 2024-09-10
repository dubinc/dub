import z from "../zod";
import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

const dotsFlowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  steps: z.array(z.string()),
  completed_steps: z.array(z.string()),
  link: z.string(),
});

export const refreshDotsKYBComplianceFlow = async ({
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
      },
    },
  );

  const data = await response.text();

  console.log("refreshDotsKYBComplianceFlow", data, appId, getEncodedCredentials());


  if (!response.ok) {
    throw new Error(`Failed to refresh Dots KYB compliance flow ${data}`);
  }


  // const data = await response.json();

  // console.log({ data });

  // return dotsFlowSchema.parse(data);
};
