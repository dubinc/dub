"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { Beehiiv, Button } from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { Framer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      onClick={async () => {
        setClicked(true);

        const { data, error } = await authClient.signIn.oauth2({
          providerId: slug,
          callbackURL: `${PARTNERS_DOMAIN}/programs/${slug}`,
        });

        if (error) {
          toast.error(error.message || `Failed to start ${name} SSO.`);
          setClicked(false);
          return;
        }

        if (!data?.url) {
          toast.error(`Failed to start ${name} SSO.`);
          setClicked(false);
          return;
        }

        window.location.href = data.url;
      }}
      {...(Logo && { icon: <Logo className="size-4 fill-white text-white" /> })}
      className={cn(!clicked && "bg-blue-600 text-white hover:bg-blue-700")}
      loading={clicked}
    />
  );
}
