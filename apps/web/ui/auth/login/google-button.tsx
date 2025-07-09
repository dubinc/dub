import { useAuthTracking } from "@/ui/modals/auth-modal.tsx";
import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext } from "react";
import { LoginFormContext } from "./login-form";

export function GoogleButton() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams?.get("next");
  const { trackAuthClick } = useAuthTracking("login");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={async () => {
        trackAuthClick("google");
        trackClientEvents({
          event: EAnalyticEvents.LOGIN_ATTEMPT,
          params: {
            method: "google",
            event_category: "unAuthorized",
          },
        });
        setClickedMethod("google");
        setLastUsedAuthMethod("google");

        const response = await signIn("google", {
          redirect: false,
          callbackUrl: next || "/workspaces",
        });

        if (response?.ok) {
          // Track successful login
          trackClientEvents({
            event: EAnalyticEvents.LOGIN_SUCCESS,
            params: {
              method: "google",
              event_category: "Authorized",
            },
          });
          router.push(response.url || next || "/workspaces");
        } else if (response?.error) {
          // Handle error if needed
          console.error("Google sign in error:", response.error);
          setClickedMethod(undefined);
        }
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
      className="border-border-500"
    />
  );
}
