"use client";

import { Button } from "@dub/ui";
import { Mail } from "lucide-react";

const subject = "Create a free account on Dub!";
const body = (url: string) => `Use my referral link to get started: ${url}`;

export function InviteButton({ url }: { url: string }) {
  return (
    <Button
      text="Invite via email"
      icon={<Mail className="size-4" />}
      className="h-9 rounded-lg"
      onClick={() =>
        window.open(
          `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(url))}`,
        )
      }
    />
  );
}
