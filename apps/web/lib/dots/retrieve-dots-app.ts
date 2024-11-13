import { dotsFetch } from "./fetch";
import { dotsAppSchema } from "./schemas";

export const retrieveDotsApp = async ({ dotsAppId }: { dotsAppId: string }) => {
  const response = await dotsFetch(`/apps/${dotsAppId}`, {
    method: "GET",
  });

  return dotsAppSchema.parse(response);
};
