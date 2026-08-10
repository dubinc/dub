"use client";

import { SSO_LOGIN_PROGRAMS } from "@/lib/auth/sso-login-programs";
import { authClient } from "@/lib/better-auth/auth-client";
import { useSession } from "@/lib/better-auth/use-session";
import { Beehiiv, Button, Logo, Modal } from "@dub/ui";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { Framer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const PROVIDER_ICONS = {
  framer: Framer,
  beehiiv: Beehiiv,
} as const;

export function ProgramSsoConnectModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [clicked, setClicked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const connectSlug = searchParams?.get("connect");
  const program = useMemo(
    () => SSO_LOGIN_PROGRAMS.find(({ slug }) => slug === connectSlug),
    [connectSlug],
  );

  useEffect(() => {
    if (status === "authenticated" && session && program) {
      setShowModal(true);
    }
  }, [status, session, program]);

  const clearConnectParam = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("connect");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  if (!program) {
    return null;
  }

  const Icon = PROVIDER_ICONS[program.slug as keyof typeof PROVIDER_ICONS];

  return (
    <Modal
      showModal={showModal}
      setShowModal={(open) => {
        setShowModal(open);
        if (!open) {
          clearConnectParam();
        }
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Connect {program.name} Account</h3>
        <p className="text-center text-sm text-neutral-500">
          Connect {program.name} to your Dub Partners account so you can sign in
          with Login with {program.name}.
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <Button
          text={`Connect ${program.name}`}
          loading={clicked}
          {...(Icon && {
            icon: <Icon className="size-4 fill-white text-white" />,
          })}
          onClick={async () => {
            setClicked(true);

            const { error } = await authClient.oauth2.link({
              providerId: program.slug,
              callbackURL: `${PARTNERS_DOMAIN}/programs/${program.slug}`,
              errorCallbackURL: `${PARTNERS_DOMAIN}/${program.slug}/login`,
            });

            if (error) {
              toast.error(
                error.message || `Failed to connect ${program.name}.`,
              );
              setClicked(false);
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            setShowModal(false);
            clearConnectParam();
          }}
          className="text-sm text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-800 active:text-neutral-400"
        >
          Not now
        </button>
      </div>
    </Modal>
  );
}
