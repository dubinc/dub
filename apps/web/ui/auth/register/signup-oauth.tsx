"use client";

import { useAuthTracking } from "@/ui/modals/auth-modal.tsx";
import { QRBuilderData } from "@/ui/modals/qr-builder";
import { Button, Github, Google, useLocalStorage } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic/analytic.service";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SignUpOAuth = ({
  methods,
}: {
  methods: ("email" | "google" | "github")[];
}) => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const [clickedGoogle, setClickedGoogle] = useState(false);
  const [clickedGithub, setClickedGithub] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const { trackAuthClick } = useAuthTracking("signup");

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

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
            // const processedQrDataToCreate = await processQrDataForServerAction(
            //   qrDataToCreate,
            //   {
            //     onUploadStart: () => setIsUploading(true),
            //     onUploadEnd: () => setIsUploading(false),
            //     onError: (errorMessage) => {
            //       showMessage(errorMessage, "error");
            //     },
            //   },
            // );

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
