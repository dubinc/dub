"use client";

import { Button } from "@dub/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function SwitchPartnerAccountButton({
  programSlug,
  invitedEmail,
}: {
  programSlug: string;
  invitedEmail: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      text={`Continue as ${invitedEmail}`}
      loading={loading}
      className="h-9 w-full max-w-sm rounded-lg"
      onClick={() => {
        setLoading(true);
        const next = `/programs/${programSlug}/invite?email=${encodeURIComponent(invitedEmail)}`;
        const callbackUrl = `/${programSlug}/register?${new URLSearchParams({
          email: invitedEmail,
          next,
        })}`;
        void signOut({ callbackUrl });
      }}
    />
  );
}
