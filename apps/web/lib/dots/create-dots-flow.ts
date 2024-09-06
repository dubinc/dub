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

export const createDotsFlow = async ({
  dotsUserId,
}: {
  dotsUserId: string;
}) => {
  const { DOTS_API_URL } = getDotsEnv();
  const authToken = getEncodedCredentials();

  const response = await fetch(`${DOTS_API_URL}/flows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
      "Api-App-Id": "021a1077-0aae-4cdc-9cd3-fe661c4d7b73",
    },
    body: JSON.stringify({
      steps: ["compliance"],
      user_id: dotsUserId,
      hide_go_to_dashboard_on_complete: true,
      // require_auth: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create Dots user");
  }

  const data = await response.json();

  return dotsFlowSchema.parse(data);
};
