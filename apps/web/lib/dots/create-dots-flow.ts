import { dotsFetch } from "./fetch";
import { DotsFlowSteps } from "./types";

export const createDotsFlow = async ({
  step,
  dotsUserId,
}: {
  step: DotsFlowSteps;
  dotsUserId?: string | null;
}) => {
  return await dotsFetch("/flows", {
    method: "POST",
    dotsAppId: "default",
    body: {
      steps: [
        {
          name: step,
          auto_payout_enabled: false,
        },
      ],
      user_id: dotsUserId,
    },
  });
};
