import { DOTS_DEFAULT_APP_ID } from "@/lib/dots/env";
import { DOTS_API_URL } from "./env";
import { dotsFetch } from "./fetch";

export const retrieveDotsFlow = async ({ flowId }: { flowId: string }) => {
  return await dotsFetch(`${DOTS_API_URL}/flows/${flowId}`, {
    method: "GET",
    dotsAppId: DOTS_DEFAULT_APP_ID,
  });
};
