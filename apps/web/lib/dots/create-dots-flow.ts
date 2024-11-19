import { dotsFetch } from "./fetch";
import { DotsFlowSteps } from "./types";

export const createDotsFlow = async ({
  steps,
  dotsUserId,
}: {
  steps?: DotsFlowSteps[];
  dotsUserId?: string | null;
}) => {
  return await dotsFetch("/flows", {
    method: "POST",
    dotsAppId: "default",
    body: {
      steps,
      user_id: dotsUserId,
    },
  });
};
