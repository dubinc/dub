"use client";

import { requestPasswordResetAction } from "@/lib/actions/request-password-reset";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const ForgotPasswordForm = () => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");

  const { executeAsync, isPending } = useAction(requestPasswordResetAction, {
    onSuccess() {
      toast.success(
        "You will receive an email with instructions to reset your password.",
      );
      router.push("/login");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeAsync({ email });
        }}
      >
        <div className="flex flex-col gap-6">
          <label>
            <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
              Email
            </span>
            <Input
              type="email"
              autoFocus={!isMobile}
              value={email}
              placeholder="panic@thedis.co"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            text={isPending ? "Sending..." : "Send reset link"}
            loading={isPending}
            disabled={email.length < 3}
          />
        </div>
      </form>
    </div>
  );
};
