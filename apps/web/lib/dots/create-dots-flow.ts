import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { DOTS_API_URL } from "./env";
import { DotsFlowSteps } from "./types";
import { dotsHeaders } from "./utils";

export const createDotsFlow = async ({
  steps,
  dotsUserId,
}: {
  steps?: DotsFlowSteps[];
  dotsUserId?: string | null;
}) => {
  const response = await fetch(`${DOTS_API_URL}/flows`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
    body: JSON.stringify({
      steps,
      user_id: dotsUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Dots flow: ${error.message}`);
  }

  return await response.json();
};
