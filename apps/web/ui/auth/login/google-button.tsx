import { QRBuilderData } from "@/ui/qr-builder/types/types";
import { Button, useLocalStorage } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FC, useContext } from "react";
import { LoginFormContext } from "./login-form";

interface IGoogleButtonProps {
  sessionId: string;
  next?: string;
}

export const GoogleLoginButton: FC<Readonly<IGoogleButtonProps>> = ({
  sessionId,
  next,
}) => {
  const [qrDataToCreate] = useLocalStorage<QRBuilderData | null>(
    "qr-data-to-create",
    null,
  );
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  const handleGoogleLoginClick = () => {
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_CLICKED,
      params: {
        page_name: "landing",
        element_name: "login",
        content_value: "google",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    trackClientEvents({
      event: EAnalyticEvents.AUTH_ATTEMPT,
      params: {
        page_name: "landing",
        auth_type: "login",
        auth_method: "google",
        auth_origin: qrDataToCreate ? "qr" : "none",
        event_category: "nonAuthorized",
      },
      sessionId,
    });
    setClickedMethod("google");
    setLastUsedAuthMethod("google");

    signIn("google", {
      ...(finalNext && finalNext.length > 0 ? { callbackUrl: finalNext } : {}),
    }).catch(() => {
      trackClientEvents({
        event: EAnalyticEvents.AUTH_ERROR,
        params: {
          page_name: "landing",
          auth_type: "login",
          auth_method: "google",
          auth_origin: qrDataToCreate ? "qr" : "none",
          event_category: "nonAuthorized",
          error_code: "google-sign-in-failed",
          error_message: "Something went wrong with Google sign in.",
        },
        sessionId,
      });
    });
  };

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={handleGoogleLoginClick}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
      className="border-border-500"
    />
  );
};
