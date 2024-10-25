import useSCIM from "@/lib/swr/use-scim";
import useWorkspace from "@/lib/swr/use-workspace";
import { SAMLProviderProps } from "@/lib/types";
import {
  Button,
  Copy,
  InfoTooltip,
  Logo,
  Modal,
  SimpleTooltipContent,
  Tick,
  useCopyToClipboard,
} from "@dub/ui";
import { SAML_PROVIDERS } from "@dub/utils";
import { Eye, EyeOff, FolderSync, RefreshCcw } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function SCIMModal({
  showSCIMModal,
  setShowSCIMModal,
}: {
  showSCIMModal: boolean;
  setShowSCIMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const { scim, provider, configured, mutate } = useSCIM();
  const [selectedProvider, setSelectedProvider] = useState<
    SAMLProviderProps["scim"] | undefined
  >(provider || undefined);
  const [showBearerToken, setShowBearerToken] = useState(false);
  const [copiedBaseUrl, copyBaseUrlToClipboard] = useCopyToClipboard();
  const [copiedBearerToken, copyBearerTokenToClipboard] = useCopyToClipboard();

  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.scim === selectedProvider),
    [selectedProvider],
  );

  return (
    <Modal showModal={showSCIMModal} setShowModal={setShowSCIMModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        {currentProvider ? (
          <div className="flex items-center space-x-3 py-4">
            <img
              src={currentProvider.logo}
              alt={`${provider} logo`}
              className="h-10 w-10"
            />
            <RefreshCcw className="h-5 w-5 text-gray-600" />
            <Logo />
          </div>
        ) : (
          <div className="rounded-full border border-gray-200 p-3">
            <FolderSync className="h-5 w-5 text-gray-600" />
          </div>
        )}

        <h3 className="text-lg font-medium">
          {currentProvider
            ? `${currentProvider.name} SCIM`
            : "Configure Directory Sync"}
        </h3>
        <p className="text-center text-sm text-gray-500">
          {currentProvider
            ? "Your workspace is currently syncing with your SCIM directory."
            : `Select a provider to configure directory sync for your ${process.env.NEXT_PUBLIC_APP_NAME} workspace.`}
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            fetch(`/api/workspaces/${id}/scim`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                provider: e.currentTarget.provider.value,
                ...(configured && {
                  currentDirectoryId: scim.directories[0].id,
                }),
              }),
            }).then(async (res) => {
              if (res.ok) {
                await mutate();
                toast.success("Successfully configured SCIM");
              } else {
                const { error } = await res.json();
                toast.error(error.message);
              }
              setSubmitting(false);
            });
          }}
          className="flex flex-col space-y-4"
        >
          <div>
            <div className="flex items-center space-x-1">
              <h2 className="text-sm font-medium text-gray-900">
                Directory Provider
              </h2>
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title="Your directory provider is the IDP you use to manage your users."
                    cta={selectedProvider ? "Read the guide." : "Learn more."}
                    href={`https://dub.co/help/${
                      currentProvider
                        ? `article/${currentProvider.saml}-scim`
                        : "category/saml-sso"
                    }`}
                  />
                }
              />
            </div>
            <select
              id="provider"
              name="provider"
              required
              value={selectedProvider}
              onChange={(e) =>
                setSelectedProvider(e.target.value as SAMLProviderProps["scim"])
              }
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            >
              <option disabled selected>
                Select a provider
              </option>
              {SAML_PROVIDERS.map((provider) => (
                <option
                  key={provider.scim}
                  value={provider.scim}
                  disabled={provider.wip}
                >
                  {provider.name} {provider.wip && "(Coming Soon)"}
                </option>
              ))}
            </select>
            {currentProvider && (
              <a
                href={`https://dub.co/help/article/${currentProvider.saml}-scim`}
                target="_blank"
                className="ml-2 mt-2 block text-sm text-gray-500 underline"
              >
                Read the guide on {currentProvider.name} SCIM
              </a>
            )}
          </div>

          {currentProvider && selectedProvider === provider && (
            <div className="mt-4 flex flex-col space-y-4">
              <div className="w-full border-t border-gray-200" />
              <div>
                <div className="flex items-center space-x-1">
                  <h2 className="text-sm font-medium text-gray-900">
                    {currentProvider.scimModalCopy.url}
                  </h2>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="Your directory provider is the IDP you use to manage your users."
                        cta="Read the guide."
                        href={`https://dub.co/help/article/${currentProvider.saml}-scim`}
                      />
                    }
                  />
                </div>
                <div className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm">
                  <div className="scrollbar-hide overflow-auto">
                    <p className="whitespace-nowrap text-gray-600 sm:text-sm">
                      {scim.directories[0].scim.endpoint}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pl-2"
                    onClick={() => {
                      const url = scim.directories[0].scim.endpoint as string;
                      toast.promise(copyBaseUrlToClipboard(url), {
                        success: "Copied to clipboard",
                      });
                    }}
                  >
                    {copiedBaseUrl ? (
                      <Tick className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-1">
                  <h2 className="text-sm font-medium text-gray-900">
                    {currentProvider.scimModalCopy.token}
                  </h2>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="Your directory provider is the IDP you use to manage your users."
                        cta="Read the guide."
                        href={`https://dub.co/help/article/${currentProvider.saml}-scim`}
                      />
                    }
                  />
                </div>
                <div className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm">
                  <input
                    type={showBearerToken ? "text" : "password"}
                    contentEditable={false}
                    className="w-full border-none p-0 focus:outline-none focus:ring-0 sm:text-sm"
                    value={`${scim.directories[0].scim.secret}`}
                  />
                  <div className="flex space-x-2 pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        const token = `${scim.directories[0].scim.secret}`;
                        toast.promise(copyBearerTokenToClipboard(token), {
                          success: "Copied to clipboard",
                        });
                      }}
                    >
                      {copiedBearerToken ? (
                        <Tick className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBearerToken(!showBearerToken)}
                    >
                      {showBearerToken ? (
                        <Eye className="h-4 w-4 text-gray-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Button
            text="Save changes"
            loading={submitting}
            disabled={!currentProvider || currentProvider.scim === provider}
          />
        </form>
      </div>
    </Modal>
  );
}

export function useSCIMModal() {
  const [showSCIMModal, setShowSCIMModal] = useState(false);

  const SCIMModalCallback = useCallback(() => {
    return (
      <SCIMModal
        showSCIMModal={showSCIMModal}
        setShowSCIMModal={setShowSCIMModal}
      />
    );
  }, [showSCIMModal, setShowSCIMModal]);

  return useMemo(
    () => ({
      setShowSCIMModal,
      SCIMModal: SCIMModalCallback,
    }),
    [setShowSCIMModal, SCIMModalCallback],
  );
}
