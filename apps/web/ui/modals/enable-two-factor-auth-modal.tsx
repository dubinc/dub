import { confirmTwoFactorAuthAction } from "@/lib/actions/auth/confirm-two-factor-auth";
import { QRCode } from "@/ui/shared/qr-code";
import { Button, CopyButton, Modal } from "@dub/ui";
import { OTPInput } from "input-otp";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface EnableTwoFactorAuthModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onSuccess?: () => void;
  secret: string;
  qrCodeUrl: string;
}

const EnableTwoFactorAuthModal = ({
  showModal,
  setShowModal,
  onSuccess,
  secret,
  qrCodeUrl,
}: EnableTwoFactorAuthModalProps) => {
  const [token, setToken] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (showModal) {
      setToken("");
      setTouched(false);
      setError(undefined);
    }
  }, [showModal]);

  const { executeAsync, isPending } = useAction(confirmTwoFactorAuthAction, {
    onSuccess: () => {
      toast.success("Two-factor authentication enabled successfully!");
      setShowModal(false);
      onSuccess?.();
    },
    onError: (error) => {
      setError(
        error.error.serverError || "Failed to validate code. Please try again.",
      );
    },
  });

  const confirmTwoFactorAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(undefined);

    await executeAsync({
      token,
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex flex-col items-center gap-6 p-4 sm:p-8">
        <h2 className="text-xl font-semibold">Enable Authenticator App</h2>
        <p className="max-w-md text-center text-sm text-neutral-600">
          Scan the QR code below with your preferred authenticator app. Then,
          enter the 6 digit code that the app provides to continue. You can also
          copy the secret below and paste it into your app.
        </p>

        <div className="mx-auto rounded-lg border bg-white p-1 shadow">
          <QRCode url={qrCodeUrl} scale={2} />
        </div>

        <div className="flex items-center gap-2 rounded bg-neutral-100 px-3 py-2">
          <span className="select-all font-mono text-sm">{secret}</span>
          <CopyButton value={secret} />
        </div>

        <form
          onSubmit={confirmTwoFactorAuth}
          className="flex w-full flex-col items-center gap-4"
        >
          <OTPInput
            maxLength={6}
            value={token}
            onChange={setToken}
            autoFocus
            render={({ slots }) => (
              <div className="flex w-full items-center justify-between gap-2">
                {slots.map(({ char, isActive, hasFakeCaret }, idx) => (
                  <div
                    key={idx}
                    className={`relative flex h-14 w-12 items-center justify-center rounded-lg border bg-white text-xl transition-all ${isActive ? "z-10 border-neutral-800 ring-2 ring-neutral-200" : "border-neutral-200"} ${(touched && token.length < 6) || error ? "border-red-500 ring-red-200" : ""}`}
                  >
                    {char}
                    {hasFakeCaret && (
                      <div className="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-5 w-px bg-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          />

          {error && (
            <p className="pt-2 text-center text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          <Button
            className="mt-2 w-full"
            text={isPending ? "Verifying..." : "Confirm"}
            type="submit"
            loading={isPending}
            disabled={token.length < 6}
          />
        </form>
      </div>
    </Modal>
  );
};

export function useEnableTwoFactorAuthModal({
  onSuccess,
  secret,
  qrCodeUrl,
}: {
  onSuccess?: () => void;
  secret: string;
  qrCodeUrl: string;
}) {
  const [showModal, setShowModal] = useState(false);

  const ModalCallback = useCallback(
    () => (
      <EnableTwoFactorAuthModal
        showModal={showModal}
        setShowModal={setShowModal}
        onSuccess={onSuccess}
        secret={secret}
        qrCodeUrl={qrCodeUrl}
      />
    ),
    [showModal, onSuccess, secret, qrCodeUrl],
  );

  return useMemo(
    () => ({
      setShowEnableTwoFactorAuthModal: setShowModal,
      EnableTwoFactorAuthModal: ModalCallback,
    }),
    [setShowModal, ModalCallback],
  );
}
