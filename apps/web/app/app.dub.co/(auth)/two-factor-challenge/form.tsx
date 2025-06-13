"use client";

import { errorCodes } from "@/ui/auth/login/login-form";
import { Button, Input, useMediaQuery } from "@dub/ui";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export const TwoFactorChallengeForm = () => {
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const response = await signIn("two-factor-challenge", {
      code,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (!response) {
      return;
    }

    if (!response.ok && response.error) {
      if (errorCodes[response.error]) {
        toast.error(errorCodes[response.error]);
      } else {
        toast.error(response.error);
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-6">
          <label>
            <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
              Authentication code
            </span>
            <Input
              type="text"
              autoFocus={!isMobile}
              value={code}
              placeholder="012345"
              pattern="[0-9]*"
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </label>
          <Button
            type="submit"
            text={loading ? "Verifying..." : "Verify code"}
            disabled={code.length < 6}
            loading={loading}
          />
        </div>
      </form>
    </div>
  );
};
