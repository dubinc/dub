import { APP_DOMAIN } from "@dub/utils";
import { useEffect } from "react";
import { DubOptions } from "./types";
import { iframeStyles } from "./utils";

export const DubDashboard = ({ token, onTokenExpired }: DubOptions) => {
  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== APP_DOMAIN) {
        return;
      }

      if (event.data === "TOKEN_EXPIRED") {
        console.error("[Dub] Link token is expired.");
        onTokenExpired?.();
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [onTokenExpired]);

  // If no link token is provided
  if (!token) {
    console.error("[Dub] A link token is required to embed the dashboard.");
    return null;
  }

  const dashboardUrl = `${APP_DOMAIN}/embed/dashboard?token=${token}`;

  return (
    <iframe
      src={dashboardUrl}
      style={{
        ...iframeStyles,
        height: "100vh",
      }}
    />
  );
};
