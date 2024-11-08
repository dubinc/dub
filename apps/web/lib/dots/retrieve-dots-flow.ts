import { DEFAULT_DOTS_APP_ID } from "@dub/utils";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

export const retrieveDotsFlow = async ({ flowId }: { flowId: string }) => {
  return await fetch(`${DOTS_API_URL}/flows/${flowId}`, {
    method: "GET",
    headers: dotsHeaders({ dotsAppId: DEFAULT_DOTS_APP_ID }),
  }).then((res) => res.json());
};
