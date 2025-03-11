import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { LoginFormContext } from "./login-form";

export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");

  const { setClickedMethod, clickedMethod, setLastUsedAuthMethod } =
    useContext(LoginFormContext);

  return (
    <Button
      text="Continue with Google"
      variant="secondary"
      onClick={() => {
        setClickedMethod("google");
        setLastUsedAuthMethod("google");
        signIn("google", {
          ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          ...(redirectTo && redirectTo.length > 0 ? { redirectTo } : {}),
        });
      }}
      loading={clickedMethod === "google"}
      disabled={clickedMethod && clickedMethod !== "google"}
      icon={<Google className="size-4" />}
    />
  );
}
