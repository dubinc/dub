import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef } from "react";
import { LoginFormContext } from "./login-form";
import { useAuthTracking } from "../../../app/app.dub.co/(auth)/auth.modal";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";

export function GoogleButton() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const { trackAuthClick } = useAuthTracking("login");
  const { data: session } = useSession();
  const hasTrackedSuccess = useRef(false);

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  // Track successful login when session becomes available
  useEffect(() => {
    if (session?.user?.email && !hasTrackedSuccess.current) {
      hasTrackedSuccess.current = true;
      trackClientEvents({
        event: EAnalyticEvents.LOGIN_SUCCESS,
        params: {
          method: "google",
          email: session.user.email,
        },
      });
    }
  }, [session]);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={() => {
        trackAuthClick("google");
        trackClientEvents({
          event: EAnalyticEvents.LOGIN_ATTEMPT,
          params: {
            method: "google",
          },
        });
        setClickedMethod("google");
        setLastUsedAuthMethod("google");
        signIn("google", {
          ...(next && next.length > 0 ? { callbackUrl: next } : {}),
        });
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
      className="border-border-500"
    />
  );
}
