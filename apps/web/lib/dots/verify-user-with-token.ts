import { dotsFetch } from "./fetch";

export const verifyUserWithToken = async ({
  dotsUserId,
  token,
}: {
  dotsUserId: string;
  token: string;
}) => {
  return await dotsFetch(`/users/${dotsUserId}/verify`, {
    method: "POST",
    dotsAppId: "default",
    body: { token },
    textResponse: true,
  });
};
