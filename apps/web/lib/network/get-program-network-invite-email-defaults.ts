// Some network partners have an email address stored as their name; treat those
// as missing rather than leaking them into invite copy.
export const getUsableNetworkPartnerName = (name?: string | null) => {
  const trimmedName = name?.trim();

  return trimmedName && !trimmedName.includes("@") ? trimmedName : null;
};

export const getNetworkPartnerDisplayName = (name?: string | null) => {
  return getUsableNetworkPartnerName(name) ?? "there";
};

export const getProgramNetworkInviteEmailDefaults = ({
  programName,
  partnerName: partnerNameProp,
}: {
  programName: string;
  partnerName?: string | null;
}) => {
  const partnerName = getNetworkPartnerDisplayName(partnerNameProp);

  return {
    subject: `${programName} invited you to join on Dub Partners`,
    title: "You're getting noticed!",
    body: `Hi ${partnerName}, ${programName} found you on the Dub Partner Network and invited you to join their partner program.`,
  };
};
