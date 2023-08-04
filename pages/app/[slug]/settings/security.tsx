import Button from "#/ui/button";
import { useSAMLModal } from "@/components/app/modals/saml-modal";
import SettingsLayout from "@/components/layout/app/settings-layout";
import { Lock } from "lucide-react";
import useProject from "#/lib/swr/use-project";
import useSWR from "swr";
import type { SAMLSSORecord } from "@boxyhq/saml-jackson";
import { fetcher } from "#/lib/utils";
import { useMemo } from "react";

export default function ProjectSecurity() {
  const { SAMLModal, setShowSAMLModal } = useSAMLModal();
  const { slug } = useProject();
  const { data: sso, isLoading } = useSWR<{ connections: SAMLSSORecord[] }>(
    slug && `/api/projects/${slug}/saml`,
    fetcher,
  );

  const data = useMemo(() => {
    if (!slug || isLoading) {
      return {
        logo: null,
        title: null,
        description: null,
      };
    } else if (sso && sso.connections.length > 0) {
      return {
        logo: (
          <img
            src="/_static/icons/okta.svg"
            alt={sso.connections[0].idpMetadata.friendlyProviderName + " logo"}
            className="h-8 w-8"
          />
        ),
        title: sso.connections[0].idpMetadata.friendlyProviderName,
        description: "SAML SSO is configured for your project.",
      };
    } else
      return {
        logo: (
          <div className="rounded-full border border-gray-200 p-2">
            <Lock className="h-4 w-4 text-gray-600" />
          </div>
        ),
        title: "SAML",
        description: "Choose an identity provider to get started.",
      };
  }, [isLoading, sso]);

  return (
    <SettingsLayout>
      <SAMLModal />
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
              <Button text="Configure" onClick={() => setShowSAMLModal(true)} />
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
