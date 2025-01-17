"use client";

import { Button } from "@dub/ui";
import { Framer } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export const FramerButton = () => {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");

  return (
    <Button
      text="Login with Framer"
      variant="secondary"
      onClick={() => {
        signIn("framer", {
          ...(next && next.length > 0 ? { callbackUrl: next } : {}),
        });
      }}
      icon={<Framer className="size-4 fill-white text-white" />}
      className="bg-blue-600 text-white h-10"
    />
  );
};
