"use client";

import { Button } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

export const SetPassword = () => {
  const [sending, setSending] = useState(false);
  const { data: session, status } = useSession();

  // Send an email to the user with instructions to set their password
  const sendPasswordSetRequest = async () => {
    try {
      setSending(true);

      const response = await fetch("/api/user/set-password", {
        method: "POST",
      });

      if (response.ok) {
        toast.success(
          `We've sent you an email to ${session?.user?.email} with instructions to set your password`,
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
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Password</h2>
        <p className="text-sm text-gray-500">Manage your account password.</p>
        <div className="mt-1 max-w-md">
          <div>
            <Button
              text="Create account password"
              onClick={sendPasswordSetRequest}
              loading={sending}
              disabled={sending}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
