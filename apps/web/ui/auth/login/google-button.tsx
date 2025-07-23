import { Button, useLocalStorage } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
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
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");

  const [, setGuestSessionId] = useLocalStorage<string | null>(
    `guest-session-id`,
    null,
  );

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
      event: EAnalyticEvents.LOGIN_ATTEMPT,
      params: {
        page_name: "landing",
        method: "google",
        event_category: "nonAuthorized",
      },
      sessionId,
    });
    setGuestSessionId(sessionId);
    setClickedMethod("google");
    setLastUsedAuthMethod("google");

    signIn("google", {
      ...(finalNext && finalNext.length > 0 ? { callbackUrl: finalNext } : {}),
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
