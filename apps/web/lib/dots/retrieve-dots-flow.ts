import { DOTS_DEFAULT_APP_ID } from "./env";
import { dotsFetch } from "./fetch";

export const retrieveDotsFlow = async ({ flowId }: { flowId: string }) => {
  return await dotsFetch(`/flows/${flowId}`, {
    method: "GET",
    dotsAppId: DOTS_DEFAULT_APP_ID,
  });
};
