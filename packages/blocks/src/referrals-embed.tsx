import { APP_DOMAIN } from "@dub/utils";

export const ReferralsEmbed = ({ publicToken }: { publicToken: string }) => {
  return (
    <iframe
      src={`${APP_DOMAIN}/embed?token=${publicToken}`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
      }}
    />
  );
};
