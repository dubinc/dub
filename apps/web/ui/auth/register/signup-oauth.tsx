"use client";

import { saveQrDataToCookieAction } from "@/lib/actions/save-qr-data-to-cookie";
import { showMessage } from "@/ui/auth/helpers.ts";
import { prepareRegistrationQrData } from "@/ui/qr-builder/helpers";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { Button, Github, Google, useLocalStorage } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
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

  const [isUploading, setIsUploading] = useState(false);

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const { execute: saveQrDataToCookie } = useAction(saveQrDataToCookieAction);

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
      const processedData = await prepareRegistrationQrData(qrDataToCreate, {
        onUploadStart: () => setIsUploading(true),
        onUploadEnd: () => setIsUploading(false),
        onError: (errorMessage) => {
          showMessage(errorMessage, "error");
        },
      });

      if (processedData) {
        setQrDataToCreate(null);
        await saveQrDataToCookie({ qrData: processedData });
      }

      return processedData;
    } catch (error) {
      console.error("Error processing QR data:", error);
      showMessage("Failed to process QR data", "error");
      return null;
    }
  };

  return (
    <>
      {methods.includes("google") && (
        <Button
          variant="secondary"
          text="Continue with Google"
          onClick={async () => {
            await handleQrDataProcessing();

            trackClientEvents({
              event: EAnalyticEvents.ELEMENT_CLICKED,
              params: {
                element_name: "signup",
                content_value: "google",
                event_category: "nonAuthorized",
              },
              sessionId,
            });

            trackClientEvents({
              event: EAnalyticEvents.SIGNUP_ATTEMPT,
              params: {
                method: "google",
                event_category: "nonAuthorized",
              },
              sessionId,
            });
            setClickedGoogle(true);

            signIn("google", {
              ...(next && next.length > 0 ? { callbackUrl: next } : {}),
            });
          }}
          loading={clickedGoogle || isUploading}
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
