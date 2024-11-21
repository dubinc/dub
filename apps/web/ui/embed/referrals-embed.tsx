import { APP_DOMAIN } from "@dub/utils";
import { useEffect } from "react";

interface ReferralsEmbedProps {
  publicToken: string;
  onTokenExpired?: () => void;
}

export const ReferralsEmbed = ({
  publicToken,
  onTokenExpired,
}: ReferralsEmbedProps) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our embed page
    if (event.origin !== APP_DOMAIN) {
        return;
      }

      if (event.data === "TOKEN_EXPIRED") {
        onTokenExpired?.();
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [onTokenExpired]);

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
