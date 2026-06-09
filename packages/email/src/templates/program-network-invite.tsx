import ProgramInvite from "./program-invite";

type ProgramInviteProps = Parameters<typeof ProgramInvite>[0];

export const getProgramNetworkInviteEmailDefaults = ({
  programName = "Acme",
  name,
}: {
  programName?: string;
  name?: string | null;
}) => {
  const trimmedName = name?.trim();
  const partnerName =
    trimmedName && !trimmedName.includes("@") ? trimmedName : "there";

  return {
    subject: `${programName} invited you to join on Dub Partners`,
    title: "You're getting noticed!",
    body: `Hi ${partnerName}, ${programName} found you on the Dub Partner Network and invited you to join their partner program.`,
  };
};

export default function ProgramNetworkInvite({
  subject,
  title,
  body,
  ...props
}: ProgramInviteProps) {
  const defaults = getProgramNetworkInviteEmailDefaults({
    programName: props.program?.name,
    name: props.name,
  });

  return ProgramInvite({
    ...props,
    subject: subject || defaults.subject,
    title: title || defaults.title,
    body: body || defaults.body,
  });
}
