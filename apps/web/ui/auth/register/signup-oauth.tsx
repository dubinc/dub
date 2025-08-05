"use client";

import { saveQrDataToRedisAction } from "@/lib/actions/save-qr-data-to-redis.ts";
import { showMessage } from "@/ui/auth/helpers.ts";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { Button, Github, Google, useLocalStorage } from "@dub/ui";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
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

  const { executeAsync: saveQrDataToRedis } = useAction(
    saveQrDataToRedisAction,
  );

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setClickedGoogle(false);
      setClickedGithub(false);
    };
  }, []);

  const handleQrDataProcessing = async () => {
    if (!qrDataToCreate) return null;

    try {
      await saveQrDataToRedis({ sessionId, qrData: qrDataToCreate });
      setQrDataToCreate(null);
      return qrDataToCreate;
    } catch (error) {
      console.error("Error saving QR data:", error);
      showMessage("Failed to save QR data", "error");
      return null;
    }
  };

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

    handleQrDataProcessing().then(() =>
      signIn("google", {
        ...(next && next.length > 0 ? { callbackUrl: next } : {}),
      }),
    );
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
