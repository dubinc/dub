"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { Button, InfoTooltip, useMediaQuery } from "@dub/ui";
import { Lock } from "lucide-react";
import { useContext } from "react";
import { toast } from "sonner";
import { LoginFormContext } from "./login-form";

export const SAMLSignIn = () => {
  const { isMobile } = useMediaQuery();

  const {
    setClickedMethod,
    clickedMethod,
    authMethod,
    setShowSSOOption,
    showSSOOption,
  } = useContext(LoginFormContext);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClickedMethod("saml");

    const response = await fetch("/api/auth/saml/verify", {
      method: "POST",
      body: JSON.stringify({
        slug: e.currentTarget.slug.value,
      }),
    });

    const verifyResponse = await response.json();

    if (!response.ok) {
      toast.error(verifyResponse.error);
      setClickedMethod(undefined);
      return;
    }

    const { workspaceId } = verifyResponse.data;

    if (!workspaceId) {
      toast.error("Failed to verify SAML connection.");
      setClickedMethod(undefined);
      return;
    }

    const { data, error } = await authClient.signIn.oauth2({
      providerId: "saml",
      additionalData: {
        tenant: workspaceId,
      },
    });

    if (error) {
      toast.error(error.message || "Failed to start SAML SSO.");
      setClickedMethod(undefined);
      return;
    }

    if (!data?.url) {
      toast.error("Failed to start SAML SSO.");
      setClickedMethod(undefined);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-3">
      {showSSOOption && (
        <div>
          {authMethod !== "saml" && (
            <div className="mb-4 mt-1 border-t border-neutral-300" />
          )}
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Workspace Slug
            </h2>
            <InfoTooltip content="This is your workspace's unique identifier on Dub. E.g. app.dub.co/acme is 'acme'." />
          </div>
          <input
            id="slug"
            name="slug"
            autoFocus={!isMobile}
            type="text"
            placeholder="my-team"
            autoComplete="off"
            required
            className="mt-1 block w-full appearance-none rounded-md border border-neutral-300 px-3 py-2 placeholder-neutral-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
      )}

      <Button
        text="Continue with SAML SSO"
        variant="secondary"
        icon={<Lock className="size-4" />}
        {...(!showSSOOption && {
          type: "button",
          onClick: (e) => {
            e.preventDefault();
            setShowSSOOption(true);
          },
        })}
        loading={clickedMethod === "saml"}
        disabled={clickedMethod && clickedMethod !== "saml"}
      />
    </form>
  );
};
