import { Button, Github } from "@dub/ui";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { LoginFormContext } from "./login-form";

export const GitHubButton = () => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Github"
      variant="secondary"
      onClick={() => {
        setClickedMethod("github");
        setLastUsedAuthMethod("github");
        signIn("github", {
          ...(next && next.length > 0 ? { callbackUrl: next } : {}),
        });
      }}
      loading={clickedMethod === "github"}
      disabled={clickedMethod && clickedMethod !== "github"}
      icon={<Github className="size-4 text-black" />}
    />
  );
};
