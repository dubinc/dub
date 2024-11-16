import { dotsFetch } from "./fetch";

export const sendVerificationToken = async ({
  dotsUserId,
}: {
  dotsUserId: string;
}) => {
  return await dotsFetch(`/users/${dotsUserId}/send-verification-token`, {
    method: "POST",
    dotsAppId: "default",
    textResponse: true,
  });
};
