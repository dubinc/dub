"use client";

import { enableTwoFactorAuthAction } from "@/lib/actions/auth/enable-two-factor-auth";
import useUser from "@/lib/swr/use-user";
import { useDisableTwoFactorAuthModal } from "@/ui/modals/disable-two-factor-auth-modal";
import { useEnableTwoFactorAuthModal } from "@/ui/modals/enable-two-factor-auth-modal";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export const TwoFactorAuth = () => {
  const { user, loading, mutate } = useUser();
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const { EnableTwoFactorAuthModal, setShowEnableTwoFactorAuthModal } =
    useEnableTwoFactorAuthModal({
      secret,
      qrCodeUrl,
      onSuccess: () => {
        setSecret("");
        setQrCodeUrl("");
        mutate();
      },
    });

  const { DisableTwoFactorAuthModal, setShowDisableTwoFactorAuthModal } =
    useDisableTwoFactorAuthModal();

  const { executeAsync: enable2FA, isPending: isEnabling } = useAction(
    enableTwoFactorAuthAction,
    {
      onSuccess: async ({ data }) => {
        if (!data) {
          toast.error("Failed to enable 2FA. Please try again.");
          return;
        }

        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setShowEnableTwoFactorAuthModal(true);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  return (
    <>
      <EnableTwoFactorAuthModal />
      <DisableTwoFactorAuthModal />
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:p-10">
          <h2 className="text-xl font-medium">Two-factor Authentication</h2>
          <p className="pb-2 text-sm text-neutral-500">
            Once two-factor is enabled you will have to provide two methods of
            authentication in order to sign in into your account.
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4 px-5 py-4 sm:px-10">
          <div className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white p-5">
            <div>
              <div className="font-semibold text-neutral-900">
                Authenticator App (TOTP)
              </div>
              <div className="text-sm text-neutral-500">
                Generate codes using an app like Google Authenticator or Okta
                Verify.
              </div>
            </div>

            <Button
              text={
                loading
                  ? "Loading..."
                  : user?.twoFactorConfirmedAt
                    ? "Disable Two-factor"
                    : "Enable Two-factor"
              }
              variant={user?.twoFactorConfirmedAt ? "danger" : "primary"}
              type="button"
              className="ml-4 w-fit"
              loading={isEnabling}
              disabled={loading}
              onClick={async () => {
                if (user?.twoFactorConfirmedAt) {
                  setShowDisableTwoFactorAuthModal(true);
                } else {
                  await enable2FA();
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
