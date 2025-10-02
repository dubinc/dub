"use client";

import { requestPasswordResetAction } from "@/lib/actions/request-password-reset";
import { showMessage } from "@/ui/auth/helpers";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MessageType } from "../../app/app.dub.co/(auth)/auth.modal";

export const ForgotPasswordForm = ({
  authModal,
  setAuthModalMessage,
}: {
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
}) => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");

  const { executeAsync, isPending } = useAction(requestPasswordResetAction, {
    onSuccess() {
      showMessage(
        "You will receive an email with instructions to reset your password.",
        "success",
        authModal,
        setAuthModalMessage,
      );
      router.push("/login");
    },
    onError({ error }) {
      showMessage(
        error.serverError || "An error occurred. Please try again.",
        "error",
        authModal,
        setAuthModalMessage,
      );
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeAsync({ email });
        }}
      >
        <div className="flex flex-col gap-8">
          <label>
            <span className="text-sm font-medium text-neutral-700">Email</span>
            <Input
              type="email"
              autoFocus={!isMobile}
              value={email}
              placeholder="panic@thedis.co"
              onChange={(e) => setEmail(e.target.value)}
              className="border-border-500 focus:border-secondary mt-1"
            />
          </label>
          <Button
            type="submit"
            text={isPending ? "Sending..." : "Send reset link"}
            loading={isPending}
            disabled={email.length < 3}
            className="border-border-500"
          />
        </div>
      </form>
    </div>
  );
};
