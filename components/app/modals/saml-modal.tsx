import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import Modal from "#/ui/modal";
import Button from "#/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import useProject from "#/lib/swr/use-project";
import { InfoTooltip, SimpleTooltipContent } from "#/ui/tooltip";
import { HOME_DOMAIN, SAML_PROVIDERS } from "#/lib/constants";
import useSAML from "#/lib/swr/use-saml";
import { SAMLProviderProps } from "#/lib/types";

function SAMLModal({
  showSAMLModal,
  setShowSAMLModal,
}: {
  showSAMLModal: boolean;
  setShowSAMLModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useProject();
  const [selectedProvider, setSelectedProvider] = useState<
    SAMLProviderProps["saml"] | undefined
  >();
  const [submitting, setSubmitting] = useState(false);
  const { mutate } = useSAML();

  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.saml === selectedProvider),
    [selectedProvider],
  );

  return (
    <Modal showModal={showSAMLModal} setShowModal={setShowSAMLModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="rounded-full border border-gray-200 p-3">
          <Lock className="h-5 w-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium">Configure SAML</h3>
        <p className="text-center text-sm text-gray-500">
          Select a provider to configure SAML for your Dub project.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            fetch(`/api/projects/${slug}/saml`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                metadataUrl: e.currentTarget.metadataUrl.value,
              }),
            }).then(async (res) => {
              if (res.ok) {
                mutate();
                toast.success("Successfully configured SAML");
                setShowSAMLModal(false);
              } else {
                const err = await res.text();
                toast.error(err);
              }
              setSubmitting(false);
            });
          }}
          className="flex flex-col space-y-4"
        >
          <div>
            <div className="flex items-center space-x-1">
              <h2 className="text-sm font-medium text-gray-900">
                SAML Provider
              </h2>
              <InfoTooltip content="Your SAML provider is the service you use to manage your users." />
            </div>
            <select
              id="provider"
              name="provider"
              required
              value={selectedProvider}
              onChange={(e) =>
                setSelectedProvider(e.target.value as SAMLProviderProps["saml"])
              }
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            >
              <option disabled selected>
                Select a provider
              </option>
              {SAML_PROVIDERS.map((provider) => (
                <option
                  key={provider.saml}
                  value={provider.saml}
                  disabled={provider.wip}
                >
                  {provider.name} {provider.wip && "(Coming Soon)"}
                </option>
              ))}
            </select>
            {currentProvider ? (
              <a
                href={`${HOME_DOMAIN}/help/article/${selectedProvider}-saml`}
                target="_blank"
                className="ml-2 mt-2 block text-sm text-gray-500 underline"
              >
                Read the guide on {currentProvider.name} SSO
              </a>
            ) : (
              <a
                href={`${HOME_DOMAIN}/help/category/saml-sso`}
                target="_blank"
                className="ml-2 mt-2 block text-sm text-gray-500 underline"
              >
                Learn more about SAML SSO
              </a>
            )}
          </div>

          {currentProvider &&
            (selectedProvider === "okta" || selectedProvider === "azure") && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-1">
                  <h2 className="text-sm font-medium text-gray-900">
                    {currentProvider.samlModalCopy.url}
                  </h2>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title={`Your ${currentProvider.samlModalCopy.url} is the URL to your SAML provider's metadata.`}
                        cta="Learn more."
                        href={`${HOME_DOMAIN}/help/article/${selectedProvider}-saml#step-4-copy-the-metadata-url`}
                      />
                    }
                  />
                </div>
                <input
                  id="metadataUrl"
                  name="metadataUrl"
                  autoFocus
                  type="url"
                  placeholder="https://"
                  autoComplete="off"
                  required
                  className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
              </div>
            )}
          <Button
            text="Save changes"
            disabled={!selectedProvider}
            loading={submitting}
          />
        </form>
      </div>
    </Modal>
  );
}

export function useSAMLModal() {
  const [showSAMLModal, setShowSAMLModal] = useState(false);

  const SAMLModalCallback = useCallback(() => {
    return (
      <SAMLModal
        showSAMLModal={showSAMLModal}
        setShowSAMLModal={setShowSAMLModal}
      />
    );
  }, [showSAMLModal, setShowSAMLModal]);

  return useMemo(
    () => ({
      setShowSAMLModal,
      SAMLModal: SAMLModalCallback,
    }),
    [setShowSAMLModal, SAMLModalCallback],
  );
}
