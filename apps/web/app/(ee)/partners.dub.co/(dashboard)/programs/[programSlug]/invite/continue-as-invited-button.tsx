"use client";

import { Button } from "@dub/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function ContinueAsInvitedButton({
  programSlug,
  invitedEmail,
}: {
  programSlug: string;
  invitedEmail: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      text={`Continue as ${invitedEmail}`}
      loading={isLoading}
      className="mt-6 h-9 w-full max-w-sm rounded-lg"
      onClick={() => {
        setIsLoading(true);
        signOut({
          callbackUrl: `/${programSlug}/register?${new URLSearchParams({
            email: invitedEmail,
            next: `/programs/${programSlug}/invite?${new URLSearchParams({
              email: invitedEmail,
            })}`,
          })}`,
        });
      }}
    />
  );
}
