import { authClient } from "@/lib/better-auth/auth-client";
import { Button, Github } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { toast } from "sonner";
import { LoginFormContext } from "./login-form";

export const GitHubButton = () => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");

  const { setClickedMethod, clickedMethod } = useContext(LoginFormContext);

  return (
    <Button
      text="Continue with GitHub"
      variant="secondary"
      onClick={async () => {
        setClickedMethod("github");
        const { error } = await authClient.signIn.social({
          provider: "github",
          ...(next && next.length > 0 ? { callbackURL: next } : {}),
        });

        if (error) {
          toast.error(error.message || "Failed to start GitHub sign in.");
          setClickedMethod(undefined);
        }
      }}
      loading={clickedMethod === "github"}
      disabled={clickedMethod && clickedMethod !== "github"}
      icon={<Github className="size-4 text-black" />}
    />
  );
};
