"use client";

import { cancelEmailChangeAction } from "@/lib/actions/cancel-email-change";
import { confirmEmailChangeAction } from "@/lib/actions/confirm-email-change";
import { useSession } from "@/lib/better-auth/use-session";
import EmptyState from "@/ui/shared/empty-state";
import { Button, InputPassword } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ConfirmEmailChangePageClient({
  token,
  currentEmail,
  newEmail,
}: {
  token: string;
  currentEmail: string;
  newEmail: string;
}) {
  const router = useRouter();
  const { refetch } = useSession();
  const [canceled, setCanceled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { executeAsync: confirmEmailChange, isPending: isConfirming } =
    useAction(confirmEmailChangeAction, {
      async onSuccess({ data }) {
        if (!data) {
          return;
        }

        setConfirmed(true);
        await refetch({ query: { disableCookieCache: true } });
        toast.success("Successfully updated your email!");
        router.replace(data.redirectTo);
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Failed to confirm the email change.");
      },
    });

  const { executeAsync: cancelEmailChange, isPending: isCanceling } = useAction(
    cancelEmailChangeAction,
    {
      onSuccess() {
        setCanceled(true);
      },
      onError({ error }) {
        toast.error(
          error.serverError ?? "Failed to cancel the email change request.",
        );
      },
    },
  );

  if (canceled) {
    return (
      <EmptyState
        icon={InputPassword}
        title="Email Change Request Canceled"
        description="Your email change request has been canceled. No changes have been made to your account. You can close this page."
      />
    );
  }

  const isPending = isConfirming || isCanceling || confirmed;

  return (
    <div className="w-full max-w-sm">
      <h3 className="text-center text-xl font-semibold">
        Confirm your email change
      </h3>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Confirm the update to your email from{" "}
        <span className="font-medium text-neutral-700">{currentEmail}</span> to{" "}
        <span className="font-medium text-neutral-900">{newEmail}</span>.
      </p>

      <div className="mt-8 flex gap-3">
        <Button
          text="Cancel request"
          variant="secondary"
          loading={isCanceling}
          disabled={isPending}
          className="flex-1"
          onClick={() => cancelEmailChange({ token })}
        />
        <Button
          text="Confirm change"
          loading={isConfirming || confirmed}
          disabled={isPending}
          className="flex-1"
          onClick={() => confirmEmailChange({ token })}
        />
      </div>
    </div>
  );
}
