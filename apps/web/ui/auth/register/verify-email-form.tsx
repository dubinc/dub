"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import { showMessage } from "@/ui/auth/helpers";
import { QRBuilderData } from "@/ui/modals/qr-builder";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { getFiles } from "@/ui/qr-builder/helpers/file-store.ts";
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
import { Options } from "qr-code-styling";
import { useState } from "react";
import { MessageType } from "../../../app/app.dub.co/(auth)/auth.modal.tsx";
import { useRegisterContext } from "./context";
import { ResendOtp } from "./resend-otp";

type TProcessedQRData = {
  title: string;
  styles: Options;
  frameOptions: {
    id: string;
  };
  qrType: EQRType;
  file?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

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
  const [isUploading, setIsUploading] = useState(false);

  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const processQrDataForServerAction =
    async (): Promise<TProcessedQRData | null> => {
      if (!qrDataToCreate) return null;

      const files = getFiles();
      if (!files || files.length === 0) {
        return { ...qrDataToCreate, file: null };
      }

      try {
        setIsUploading(true);
        const firstFile = files[0];

        const formData = new FormData();
        formData.append("file", firstFile);

        const response = await fetch("/api/qrs/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const { fileId } = await response.json();
        return {
          ...qrDataToCreate,
          file: fileId,
          fileName: firstFile.name,
          fileSize: firstFile.size,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        showMessage(
          "Failed to upload file. Please try again.",
          "error",
          authModal,
          setAuthModalMessage,
        );
        return { ...qrDataToCreate, file: null };
      } finally {
        setIsUploading(false);
      }
    };

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

  const handleSubmit = async () => {
    const processedQrDataToCreate = await processQrDataForServerAction();

    await executeAsync({
      email,
      password,
      code,
      qrDataToCreate: processedQrDataToCreate,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <AnimatedSizeContainer height>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleSubmit();
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
              onComplete={handleSubmit}
            />
            {isInvalidCode && (
              <p className="mt-2 text-center text-sm text-red-500">
                Invalid code. Please try again.
              </p>
            )}

            <Button
              className="border-border-500 mt-8"
              text={
                isUploading
                  ? "Uploading file..."
                  : isPending
                    ? "Verifying..."
                    : "Continue"
              }
              type="submit"
              loading={isPending || isRedirecting || isUploading}
              disabled={!code || code.length < 6 || isUploading}
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
