import Button from "#/ui/button";
import { useSAMLModal } from "@/components/app/modals/saml-modal";
import { useRemoveSAMLModal } from "@/components/app/modals/remove-saml-modal";
import SettingsLayout from "@/components/layout/app/settings-layout";
import { Lock, ShieldOff } from "lucide-react";
import useProject from "#/lib/swr/use-project";
import { useMemo, useState } from "react";
import { ThreeDots } from "@/components/shared/icons";
import Popover from "#/ui/popover";
import IconMenu from "@/components/shared/icon-menu";
import useSAML from "#/lib/swr/use-saml";

export default function ProjectSecurity() {
  const { SAMLModal, setShowSAMLModal } = useSAMLModal();
  const { RemoveSAMLModal, setShowRemoveSAMLModal } = useRemoveSAMLModal();
  const { slug } = useProject();
  const { saml, isLoading } = useSAML();

  const data = useMemo(() => {
    if (!slug || isLoading) {
      return {
        status: "loading",
        logo: null,
        title: null,
        description: null,
      };
    } else if (saml && saml.connections.length > 0) {
      return {
        status: "configured",
        logo: (
          <img
            src="/_static/icons/okta.svg"
            alt={saml.connections[0].idpMetadata.friendlyProviderName + " logo"}
            className="h-8 w-8"
          />
        ),
        title: `${saml.connections[0].idpMetadata.friendlyProviderName} SAML`,
        description: "SAML SSO is configured for your project.",
      };
    } else
      return {
        status: "unconfigured",
        logo: (
          <div className="rounded-full border border-gray-200 p-2">
            <Lock className="h-4 w-4 text-gray-600" />
          </div>
        ),
        title: "SAML",
        description: "Choose an identity provider to get started.",
      };
  }, [isLoading, saml]);

  const [openPopover, setOpenPopover] = useState(false);

  return (
    <SettingsLayout>
      {data.status === "unconfigured" && <SAMLModal />}
      {data.status === "configured" && <RemoveSAMLModal />}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">SAML Single Sign-On</h2>
            <p className="text-sm text-gray-500">
              Set up SAML Single Sign-On (SSO) to allow your team to sign in to
              Dub with your identity provider.
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-4">
              {data.logo || (
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
              )}
              <div className="flex flex-col">
                {data.title ? (
                  <h3 className="font-medium">{data.title}</h3>
                ) : (
                  <div className="h-5 w-20 animate-pulse rounded-md bg-gray-100" />
                )}
                {data.description ? (
                  <p className="text-sm text-gray-500">
                    Choose an identity provider to get started.
                  </p>
                ) : (
                  <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-gray-100" />
                )}
              </div>
            </div>
            <div>
              {data.status === "loading" ? (
                <div className="h-9 w-24 animate-pulse rounded-md bg-gray-100" />
              ) : data.status === "configured" ? (
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
                    className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <span className="sr-only">Edit</span>
                    <ThreeDots className="h-5 w-5 text-gray-500" />
                  </button>
                </Popover>
              ) : (
                <Button
                  text="Configure"
                  onClick={() => setShowSAMLModal(true)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-3 py-5 sm:px-10">
          <p className="text-sm text-gray-500">Learn more about SAML SSO</p>
        </div>
      </div>
    </SettingsLayout>
  );
}
