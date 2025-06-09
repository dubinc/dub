"use client";

import { Button, Input, useMediaQuery } from "@dub/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export const TwoFactorChallengeForm = () => {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [code, setCode] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    //
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
              placeholder="123456"
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <Button type="submit" text="Verify code" disabled={code.length < 6} />
        </div>
      </form>
    </div>
  );
};
