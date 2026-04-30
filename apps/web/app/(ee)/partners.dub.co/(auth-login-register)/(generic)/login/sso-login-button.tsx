"use client";

import { Beehiiv, Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { Framer } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function SSOLoginButton({ name, slug }: { name: string; slug: string }) {
  const [clicked, setClicked] = useState(false);
  const Logo = {
    framer: Framer,
    beehiiv: Beehiiv,
  }[slug];

  return (
    <Button
      text={`Login with ${name}`}
      variant="secondary"
      onClick={() => {
        setClicked(true);
        signIn(slug, {
          callbackUrl: `/programs/${slug}`,
        });
      }}
      {...(Logo && { icon: <Logo className="size-4 fill-white text-white" /> })}
      className={cn(!clicked && "bg-blue-600 text-white hover:bg-blue-700")}
      loading={clicked}
    />
  );
}
