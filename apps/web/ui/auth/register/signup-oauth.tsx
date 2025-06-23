"use client";

import useUser from "@/lib/swr/use-user";
import { useAuthTracking } from "@/ui/modals/auth-modal.tsx";
import { Button, Github, Google } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const SignUpOAuth = ({
  methods,
}: {
  methods: ("email" | "google" | "github")[];
}) => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);
  const { trackAuthClick } = useAuthTracking("signup");
  const { user } = useUser();
  const hasTrackedSuccess = useRef(false);

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
    };
  }, []);

  // Track successful signup when session becomes available
  useEffect(() => {
    if (user?.email && !hasTrackedSuccess.current) {
      hasTrackedSuccess.current = true;
      trackClientEvents({
        event: EAnalyticEvents.SIGNUP_SUCCESS,
        params: {
          method: "google",
          email: user.email,
        },
      });
    }
  }, [user]);

  return (
    <>
      {methods.includes("google") && (
        <Button
          variant="secondary"
          text="Continue with Google"
          onClick={() => {
            trackAuthClick("google");
            trackClientEvents({
              event: EAnalyticEvents.SIGNUP_ATTEMPT,
              params: {
                method: "google",
              },
            });
            setClickedGoogle(true);
            signIn("google", {
              ...(next && next.length > 0 ? { callbackUrl: next } : {}),
            });
          }}
          loading={clickedGoogle}
          icon={<Google className="h-4 w-4" />}
          className="border-border-500"
        />
      )}
      {methods.includes("github") && (
        <Button
          variant="secondary"
          text="Continue with GitHub"
          onClick={() => {
            setClickedGithub(true);
            signIn("github", {
              ...(next && next.length > 0 ? { callbackUrl: next } : {}),
            });
          }}
          loading={clickedGithub}
          icon={<Github className="h-4 w-4" />}
        />
      )}
    </>
  );
};
