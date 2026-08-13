import { authClient } from "@/lib/better-auth/auth-client";
import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { toast } from "sonner";
import { getPostLoginRedirect } from "./get-post-login-redirect";
import { LoginFormContext } from "./login-form";

export function GoogleButton({ next }: { next?: string }) {
  const searchParams = useSearchParams();
  const finalNext = getPostLoginRedirect({
    next,
    searchParamsNext: searchParams?.get("next"),
  });

  const { setClickedMethod, clickedMethod } = useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={async () => {
        setClickedMethod("google");
        const { error } = await authClient.signIn.social({
          provider: "google",
          callbackURL: finalNext,
        });

        if (error) {
          toast.error(error.message || "Failed to start Google sign in.");
          setClickedMethod(undefined);
        }
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
    />
  );
}
