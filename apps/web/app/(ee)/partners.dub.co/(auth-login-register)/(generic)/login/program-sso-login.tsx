"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { ProgramSsoAccountExistsModal } from "@/ui/auth/program-sso-account-exists-modal";
import { Beehiiv, Button } from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { Framer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PROVIDER_ICONS = {
  framer: Framer,
  beehiiv: Beehiiv,
} as const;

export function ProgramSsoLogin({
  name,
  slug,
  logo,
  applyUrl,
}: {
  name: string;
  slug: string;
  logo: string;
  applyUrl: string;
}) {
  const [clicked, setClicked] = useState(false);
  const Icon = PROVIDER_ICONS[slug as keyof typeof PROVIDER_ICONS];

  return (
    <>
      <div className="mx-auto my-10 flex w-full max-w-sm flex-col gap-8">
        <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
          <img src={logo} alt={`${name} Logo`} className="h-8" />
        </div>
        <div className="animate-slide-up-fade flex flex-col items-center justify-center gap-2 [--offset:10px] [animation-delay:0.15s] [animation-duration:1.3s] [animation-fill-mode:both]">
          <h1 className="text-lg font-medium text-neutral-800">
            Sign in to {name} Partners
          </h1>
          <p className="text-center text-sm text-neutral-700">
            Not a {name} Partner?&nbsp;
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-normal underline decoration-dotted underline-offset-2 transition-colors hover:text-black"
            >
              Apply today
            </a>
          </p>
        </div>

        <div className="animate-slide-up-fade [--offset:10px] [animation-delay:0.3s] [animation-duration:1.3s] [animation-fill-mode:both]">
          <Button
            text={`Login with ${name}`}
            variant="secondary"
            onClick={async () => {
              setClicked(true);

              const { data, error } = await authClient.signIn.oauth2({
                providerId: slug,
                callbackURL: `${PARTNERS_DOMAIN}/programs/${slug}`,
                errorCallbackURL: `${PARTNERS_DOMAIN}/${slug}/login`,
                disableRedirect: true,
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
            {...(Icon && {
              icon: <Icon className="size-4 fill-white text-white" />,
            })}
            className={cn(
              !clicked && "bg-blue-600 text-white hover:bg-blue-700",
            )}
            loading={clicked}
          />
        </div>
      </div>

      <ProgramSsoAccountExistsModal name={name} slug={slug} />
    </>
  );
}
