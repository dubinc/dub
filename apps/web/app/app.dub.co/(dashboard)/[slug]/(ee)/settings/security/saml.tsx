"use client";

import useSAML from "@/lib/swr/use-saml";
import useWorkspace from "@/lib/swr/use-workspace";
import { useRemoveSAMLModal } from "@/ui/modals/remove-saml-modal";
import { useSAMLModal } from "@/ui/modals/saml-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Badge,
  Button,
  Globe2,
  IconMenu,
  Popover,
  Switch,
  TooltipContent,
  useOptimisticUpdate,
} from "@dub/ui";
import { SAML_PROVIDERS } from "@dub/utils";
import { Lock, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";

export function SAML() {
  const { id: workspaceId, plan, ssoEmailDomain } = useWorkspace();
  const { SAMLModal, setShowSAMLModal } = useSAMLModal();
  const { RemoveSAMLModal, setShowRemoveSAMLModal } = useRemoveSAMLModal();
  const { provider, configured, loading } = useSAML();
  const [openPopover, setOpenPopover] = useState(false);

  const {
    data: workspaceData,
    isLoading,
    update,
  } = useOptimisticUpdate<{
    ssoEnforcedAt: string | null;
  }>(`/api/workspaces/${workspaceId}`, {
    loading: "Saving SAML SSO login setting...",
    success: "SAML SSO login setting has been updated successfully.",
    error: "Failed to update SAML SSO login settings.",
  });

  const currentProvider = useMemo(
    () => provider && SAML_PROVIDERS.find((p) => p.name.startsWith(provider)),
    [provider],
  );

  const data = useMemo(() => {
    if (loading) {
      return {
        logo: null,
        title: null,
        description: null,
      };
    } else if (currentProvider) {
      return {
        logo: (
          <img
            src={currentProvider.logo}
            alt={currentProvider.name}
            className="h-8 w-8"
          />
        ),
        title: `${currentProvider.name} SAML`,
        description: "SAML SSO is configured for your workspace.",
      };
    } else {
      return {
        status: "unconfigured",
        logo: (
          <div className="rounded-full border border-neutral-200 p-2">
            <Lock className="h-4 w-4 text-neutral-600" />
          </div>
        ),
        title: "SAML",
        description: "Choose an identity provider to get started.",
      };
    }
  }, [provider, configured, loading]);

  const handleSSOEnforcementChange = async (enforceSAML: boolean) => {
    if (!configured) {
      return;
    }

    const updateWorkspace = async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enforceSAML }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message || "Failed to update workspace.");
      }

      const data = await response.json();

      return {
        ssoEnforcedAt: data.ssoEnforcedAt,
      };
    };

    await update(updateWorkspace, {
      ssoEnforcedAt: enforceSAML ? new Date().toISOString() : null,
    });
  };

  return (
    <>
      {configured ? <RemoveSAMLModal /> : <SAMLModal />}
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="relative flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium text-neutral-900">
              SAML Single Sign-On
            </h2>
            <p className="text-sm text-neutral-500">
              Set up SAML Single Sign-On (SSO) to allow your team to sign in to{" "}
              {process.env.NEXT_PUBLIC_APP_NAME} with your identity provider.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white">
            <div className="flex flex-col items-start justify-between space-y-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {data.logo || (
                  <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-100" />
                )}
                <div className="flex flex-col">
                  {data.title ? (
                    <h3 className="font-medium">{data.title}</h3>
                  ) : (
                    <div className="h-5 w-20 animate-pulse rounded-md bg-neutral-100" />
                  )}
                  {data.description ? (
                    <p className="text-sm text-neutral-500">
                      {data.description}
                    </p>
                  ) : (
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-neutral-100" />
                  )}
                </div>
              </div>
              <div>
                {loading ? (
                  <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-100" />
                ) : configured ? (
                  <Popover
                    content={
                      <div className="grid w-full gap-1 p-2 sm:w-48">
                        <button
                          onClick={() => {
                            setShowRemoveSAMLModal(true);
                            setOpenPopover(false);
                          }}
                          className="rounded-md p-2 text-left text-sm font-medium text-red-600 transition-all duration-75 hover:bg-red-600 hover:text-white"
                        >
                          <IconMenu
                            text="Remove"
                            icon={<ShieldOff className="h-4 w-4" />}
                          />
                        </button>
                      </div>
                    }
                    align="end"
                    openPopover={openPopover}
                    setOpenPopover={setOpenPopover}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPopover(!openPopover);
                      }}
                      className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-neutral-100 active:bg-neutral-200"
                    >
                      <span className="sr-only">Edit</span>
                      <ThreeDots className="h-5 w-5 text-neutral-500" />
                    </button>
                  </Popover>
                ) : (
                  <Button
                    text="Configure"
                    disabled={plan !== "enterprise"}
                    {...(plan !== "enterprise" && {
                      disabledTooltip: (
                        <TooltipContent
                          title="SAML SSO is only available on Enterprise plans. Upgrade to get started."
                          cta="Contact sales"
                          href="https://dub.co/enterprise"
                          target="_blank"
                        />
                      ),
                    })}
                    onClick={() => setShowSAMLModal(true)}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-800">
                  Require workspace members to login with SAML to access this
                  workspace
                </label>
                {workspaceData?.ssoEnforcedAt && (
                  <Badge
                    variant="blueGradient"
                    className="flex items-center gap-1"
                  >
                    <Globe2 className="size-3" />
                    {ssoEmailDomain}
                  </Badge>
                )}
              </div>
              <Switch
                checked={workspaceData?.ssoEnforcedAt !== null}
                loading={isLoading}
                disabled={plan !== "enterprise"}
                fn={handleSSOEnforcementChange}
              />
            </div>
          </div>
        </div>

        <div className="rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 pb-4 pt-3">
          <a
            href="https://dub.co/help/category/saml-sso"
            target="_blank"
            className="text-sm text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-700"
          >
            Learn more about SAML SSO
          </a>
        </div>
      </div>
    </>
  );
}
