"use client";

import useUser from "@/lib/swr/use-user";
import { Button } from "@dub/ui";
import { useState } from "react";
import { toast } from "sonner";

// Displayed when the user doesn't have a password set for their account
export const RequestSetPassword = () => {
  const { user } = useUser();
  const [sending, setSending] = useState(false);

  // Send an email to the user with instructions to set their password
  const sendPasswordSetRequest = async () => {
    try {
      setSending(true);

      const response = await fetch("/api/user/set-password", {
        method: "POST",
      });

      if (response.ok) {
        toast.success(
          `We've sent you an email to ${user?.email} with instructions to set your password`,
        );
        return;
      }

      const { error } = await response.json();
      throw new Error(error.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Password</h2>
        <p className="pb-2 text-sm text-gray-500">
          Your account is managed by{" "}
          <span className="uppercase">{user?.provider}</span>. You can set a
          password to use with your Dub account.
        </p>
      </div>
      <div className="p-5 sm:p-10">
        <Button
          text="Create account password"
          onClick={sendPasswordSetRequest}
          loading={sending}
          disabled={sending}
          className="w-fit"
        />
      </div>
    </div>
  );
};
