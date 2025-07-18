import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FC, useContext } from "react";
import { LoginFormContext } from "./login-form";

interface IGoogleButtonProps {
  sessionId: string;
}

export const GoogleLoginButton: FC<Readonly<IGoogleButtonProps>> = ({
  sessionId,
}) => {
  const searchParams = useSearchParams();
  // const router = useRouter();
  const next = searchParams?.get("next");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={async () => {
        trackClientEvents({
          event: EAnalyticEvents.ELEMENT_CLICKED,
          params: {
            element_name: "login",
            content_value: "google",
            event_category: "nonAuthorized",
          },
          sessionId,
        });

        trackClientEvents({
          event: EAnalyticEvents.LOGIN_ATTEMPT,
          params: {
            method: "google",
            event_category: "nonAuthorized",
          },
          sessionId,
        });
        setClickedMethod("google");
        setLastUsedAuthMethod("google");

        setTimeout(async () => {
          const response = await signIn("google", {
            redirect: false,
            callbackUrl: next || "/workspaces",
          });

          if (response?.ok) {
            // router.push(response.url || next || "/workspaces");
          } else if (response?.error) {
            // Handle error if needed
            console.error("Google sign in error:", response.error);
            setClickedMethod(undefined);
          }
        }, 500);
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
      className="border-border-500"
    />
  );
};
