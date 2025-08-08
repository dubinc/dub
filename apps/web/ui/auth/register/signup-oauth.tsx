"use client";

import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { Button, Github, Google, useLocalStorage } from "@dub/ui";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SignUpOAuth = ({
  sessionId,
  methods,
}: {
  sessionId: string;
  methods: ("email" | "google" | "github")[];
}) => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
    };
  }, []);

  const handleGoogleClick = async () => {
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_CLICKED,
      params: {
        page_name: "landing",
        element_name: "signup",
        content_value: "google",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    trackClientEvents({
      event: EAnalyticEvents.SIGNUP_ATTEMPT,
      params: {
        page_name: "landing",
        method: "google",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    if (qrDataToCreate) {
      setQrDataToCreate(null);
    }

    const callbackUrl =
      next && next.length > 0 ? `${next}?onboarded=true` : "/?onboarded=true";

    signIn("google", { callbackUrl });
  };

  return (
    <>
      {methods.includes("google") && (
        <Button
          variant="secondary"
          text="Continue with Google"
          onClick={async () => {
            setClickedGoogle(true);

            await handleGoogleClick();
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
