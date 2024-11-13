import { DOTS_DEFAULT_APP_ID } from "@/lib/dots/env";
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
    dotsAppId: DOTS_DEFAULT_APP_ID,
    body: {
      steps,
      user_id: dotsUserId,
    },
  });
};
