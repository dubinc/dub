"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { useSession } from "@/lib/better-auth/use-session";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const ForgotPasswordForm = () => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "authenticated") {
      toast.error("You are already logged in.");
      router.push("/");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message || "Failed to send reset link.");
      }

      toast.success(
        "You will receive an email with instructions to reset your password.",
      );
      router.push("/login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <form onSubmit={onSubmit}>
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
            text={isSubmitting ? "Sending..." : "Send reset link"}
            loading={isSubmitting}
            disabled={email.length < 3}
          />
        </div>
      </form>
    </div>
  );
};
