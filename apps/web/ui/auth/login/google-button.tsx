import { authClient } from "@/lib/better-auth/auth-client";
import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { LoginFormContext } from "./login-form";

export function GoogleButton({ next }: { next?: string }) {
  const searchParams = useSearchParams();
  const finalNext = next ?? searchParams?.get("next");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={() => {
        setClickedMethod("google");
        setLastUsedAuthMethod("google");
        authClient.signIn.social({
          provider: "google",
          ...(finalNext && finalNext.length > 0
            ? { callbackURL: finalNext }
            : {}),
        });
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
    />
  );
}
