import { dotsFetch } from "./fetch";

export const retrieveDotsFlow = async ({ flowId }: { flowId: string }) => {
  return await dotsFetch(`/flows/${flowId}`, {
    method: "GET",
    dotsAppId: "default",
  });
};
