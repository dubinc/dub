"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import { showMessage } from "@/ui/auth/helpers";
import { QRBuilderData } from "@/ui/modals/qr-builder";
import { getFiles } from "@/ui/qr-builder/helpers/file-store.ts";
import { fileToBase64 } from "@/ui/utils/file-to-base64.ts";
import {
  AnimatedSizeContainer,
  Button,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { OTPInput } from "input-otp";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageType } from "../../../app/app.dub.co/(auth)/auth.modal.tsx";
import { useRegisterContext } from "./context";
import { ResendOtp } from "./resend-otp";

export const VerifyEmailForm = ({
  authModal = false,
  setAuthModalMessage,
}: {
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}) => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");
  const { email, password } = useRegisterContext();
  const [isInvalidCode, setIsInvalidCode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const processQrDataForServerAction = async () => {
    if (!qrDataToCreate) return null;

    const files = getFiles();
    if (!files || files.length === 0) {
      return { ...qrDataToCreate, file: null };
    }

    const firstFile = files[0];
    const base64Content = (await fileToBase64(firstFile)) as string;

    return { ...qrDataToCreate, file: base64Content };
  };

  console.log("[qrDataToCreate] qrDataToCreate", qrDataToCreate);
  const { executeAsync, isPending } = useAction(createUserAccountAction, {
    async onSuccess() {
      showMessage(
        "Account created! Redirecting to dashboard...",
        "success",
        authModal,
        setAuthModalMessage,
      );
      setIsRedirecting(true);
      setQrDataToCreate(null);
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.ok) {
        // router.push("/onboarding");
        router.push(`/${slugify(email)}?onboarded=true`);
      } else {
        showMessage(
          "Failed to sign in with credentials. Please try again or contact support.",
          "error",
          authModal,
          setAuthModalMessage,
        );
      }
    },
    onError({ error }) {
      showMessage(error.serverError, "error", authModal, setAuthModalMessage);
      setCode("");
      setIsInvalidCode(true);
    },
  });

  if (!email || !password) {
    router.push("/register");
    return;
  }

  return (
    <div className="flex flex-col gap-3">
      {/*<div>debug {processedQrDataToCreate?.files?.length}</div>*/}
      <AnimatedSizeContainer height>
        <form
          // onSubmit={(e) => {
          //   e.preventDefault();
          //   executeAsync({ email, password, code, qrDataToCreate });
          // }}
          onSubmit={async (e) => {
            e.preventDefault();
            const processedQrDataToCreate =
              await processQrDataForServerAction();
            console.log(
              "[qrDataToCreate] processedQrDataToCreate",
              processedQrDataToCreate,
            );
            executeAsync({
              email,
              password,
              code,
              qrDataToCreate: processedQrDataToCreate,
            });
          }}
        >
          <div>
            <OTPInput
              maxLength={6}
              value={code}
              onChange={(code) => {
                setIsInvalidCode(false);
                setCode(code);
              }}
              autoFocus={!isMobile}
              containerClassName="group flex items-center justify-center"
              render={({ slots }) => (
                <div className="flex items-center">
                  {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "relative flex h-14 w-10 items-center justify-center text-xl",
                        "border-border-500 border-y border-r bg-white first:rounded-l-lg first:border-l last:rounded-r-lg",
                        "ring-0 transition-all",
                        isActive &&
                          "z-10 border border-neutral-500 ring-2 ring-neutral-200",
                        isInvalidCode && "border-red-500 ring-red-200",
                      )}
                    >
                      {char}
                      {hasFakeCaret && (
                        <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="bg-neutral h-5 w-px" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              // onComplete={() => {
              //   executeAsync({
              //     email,
              //     password,
              //     code,
              //     qrDataToCreate,
              //   });
              // }}
              onComplete={async () => {
                const processedQrDataToCreate =
                  await processQrDataForServerAction();
                console.log(
                  "[qrDataToCreate] processedQrDataToCreate onComplete",
                  processedQrDataToCreate,
                );
                executeAsync({
                  email,
                  password,
                  code,
                  qrDataToCreate: processedQrDataToCreate,
                });
              }}
            />
            {isInvalidCode && (
              <p className="mt-2 text-center text-sm text-red-500">
                Invalid code. Please try again.
              </p>
            )}

            <Button
              className="border-border-500 mt-8"
              text={isPending ? "Verifying..." : "Continue"}
              type="submit"
              loading={isPending || isRedirecting}
              disabled={!code || code.length < 6}
            />
          </div>
        </form>

        <ResendOtp
          email={email}
          authModal={authModal}
          setAuthModalMessage={setAuthModalMessage}
        />
      </AnimatedSizeContainer>
    </div>
  );
};
