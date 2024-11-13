import { dotsFetch } from "./fetch";

export const refreshComplianceFlow = async ({
  dotsAppId,
}: {
  dotsAppId: string;
}) => {
  return await dotsFetch(`/apps/${dotsAppId}/compliance-flow`, {
    method: "POST",
    body: {},
  });
};
