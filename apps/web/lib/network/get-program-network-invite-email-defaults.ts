export const getProgramNetworkInviteEmailDefaults = ({
  programName,
  partnerName: partnerNameProp,
}: {
  programName: string;
  partnerName?: string | null;
}) => {
  const trimmedPartnerName = partnerNameProp?.trim();
  const partnerName =
    trimmedPartnerName && !trimmedPartnerName.includes("@")
      ? trimmedPartnerName
      : "there";

  return {
    subject: `${programName} invited you to join on Dub Partners`,
    title: "You're getting noticed!",
    body: `Hi ${partnerName}, ${programName} found you on the Dub Partner Network and invited you to join their partner program.`,
  };
};
