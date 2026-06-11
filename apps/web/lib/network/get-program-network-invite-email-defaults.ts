// Some network partners have an email address (or nothing) stored as their
// name; fall back to a generic greeting rather than leaking it
export const getNetworkPartnerDisplayName = (name?: string | null) => {
  const trimmedName = name?.trim();

  return trimmedName && !trimmedName.includes("@") ? trimmedName : "there";
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
