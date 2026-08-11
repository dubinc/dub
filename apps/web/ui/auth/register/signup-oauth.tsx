"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { getValidInternalRedirectPath } from "@/lib/middleware/utils/is-valid-internal-redirect";
import { Button, Github, Google } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const SignUpOAuth = ({
  methods,
}: {
  methods: ("email" | "google" | "github")[];
}) => {
  const searchParams = useSearchParams();
  const next = getValidInternalRedirectPath({
    redirectPath: searchParams.get("next"),
    currentUrl: window.location.href,
  });
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
    };
  }, []);

  return (
    <>
      {methods.includes("google") && (
        <Button
          variant="secondary"
          text="Continue with Google"
          onClick={async () => {
            setClickedGoogle(true);
            const { error } = await authClient.signIn.social({
              provider: "google",
              ...(next && next.length > 0 ? { callbackURL: next } : {}),
            });

            if (error) {
              toast.error(error.message || "Failed to start Google sign in.");
              setClickedGoogle(false);
            }
          }}
          loading={clickedGoogle}
          icon={<Google className="h-4 w-4" />}
        />
      )}
      {methods.includes("github") && (
        <Button
          variant="secondary"
          text="Continue with GitHub"
          onClick={async () => {
            setClickedGithub(true);
            const { error } = await authClient.signIn.social({
              provider: "github",
              ...(next && next.length > 0 ? { callbackURL: next } : {}),
            });

            if (error) {
              toast.error(error.message || "Failed to start GitHub sign in.");
              setClickedGithub(false);
            }
          }}
          loading={clickedGithub}
          icon={<Github className="h-4 w-4" />}
        />
      )}
    </>
  );
};
