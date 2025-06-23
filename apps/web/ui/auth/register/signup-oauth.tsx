"use client";

import { Button, Github, Google } from "@dub/ui";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuthTracking } from "../../../app/app.dub.co/(auth)/auth.modal";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";

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
  const { data: session } = useSession();
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
    if (session?.user?.email && !hasTrackedSuccess.current) {
      hasTrackedSuccess.current = true;
      trackClientEvents({
        event: EAnalyticEvents.SIGNUP_SUCCESS,
        params: {
          method: "google",
          email: session.user.email,
        },
      });
    }
  }, [session]);

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
