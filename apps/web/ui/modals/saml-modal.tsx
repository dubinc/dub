import useSAML from "@/lib/swr/use-saml";
import useWorkspace from "@/lib/swr/use-workspace";
import { SAMLProviderProps } from "@/lib/types";
import {
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  useMediaQuery,
} from "@dub/ui";
import { SAML_PROVIDERS } from "@dub/utils";
import { Check, Lock, UploadCloud } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function SAMLModal({
  showSAMLModal,
  setShowSAMLModal,
}: {
  showSAMLModal: boolean;
  setShowSAMLModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id } = useWorkspace();
  const [selectedProvider, setSelectedProvider] = useState<
    SAMLProviderProps["saml"] | undefined
  >();
  const [submitting, setSubmitting] = useState(false);
  const { mutate } = useSAML();

  const currentProvider = useMemo(
    () => SAML_PROVIDERS.find((p) => p.saml === selectedProvider),
    [selectedProvider],
  );

  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");

  const { isMobile } = useMediaQuery();

  return (
    <Modal showModal={showSAMLModal} setShowModal={setShowSAMLModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-16">
        <div className="rounded-full border border-neutral-200 p-3">
          <Lock className="h-5 w-5 text-neutral-600" />
        </div>
        <h3 className="text-lg font-medium">Configure SAML</h3>
        <p className="text-center text-sm text-neutral-500">
          Select a provider to configure SAML for your{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} workspace.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            fetch(`/api/workspaces/${id}/saml`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                metadataUrl: e.currentTarget.metadataUrl?.value,
                encodedRawMetadata: fileContent
                  ? Buffer.from(fileContent).toString("base64")
                  : undefined,
              }),
            }).then(async (res) => {
              if (res.ok) {
                await mutate();
                setShowSAMLModal(false);
                toast.success("Successfully configured SAML");
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
              <h2 className="text-sm font-medium text-neutral-900">
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
              className="mt-1 block w-full appearance-none rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
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
                  {provider.name}
                  {provider.wip && "(Coming Soon)"}
                </option>
              ))}
            </select>
            {currentProvider ? (
              <a
                href={`https://dub.co/help/article/${selectedProvider}-saml`}
                target="_blank"
                className="ml-2 mt-2 block text-sm text-neutral-500 underline"
              >
                Read the guide on {currentProvider.name} SSO
              </a>
            ) : (
              <a
                href="https://dub.co/help/category/saml-sso"
                target="_blank"
                className="ml-2 mt-2 block text-sm text-neutral-500 underline"
              >
                Learn more about SAML SSO
              </a>
            )}
          </div>

          {currentProvider &&
            (selectedProvider === "google" ? (
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center space-x-1">
                  <h2 className="text-sm font-medium text-neutral-900">
                    {currentProvider.samlModalCopy}
                  </h2>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title={`Your ${currentProvider.samlModalCopy} is the URL to your SAML provider's metadata.`}
                        cta="Learn more."
                        href={`https://dub.co/help/article/${selectedProvider}-saml`}
                      />
                    }
                  />
                </div>
                <label
                  htmlFor="metadataRaw"
                  className="group relative mt-1 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-neutral-300 bg-white shadow-sm transition-all hover:bg-neutral-50"
                >
                  {file ? (
                    <>
                      <Check className="h-5 w-5 text-green-600 transition-all duration-75 group-hover:scale-110 group-active:scale-95" />
                      <p className="mt-2 text-sm text-neutral-500">
                        {file.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5 text-neutral-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95" />
                      <p className="mt-2 text-sm text-neutral-500">
                        Choose an .xml file to upload
                      </p>
                    </>
                  )}
                </label>
                <input
                  id="metadataRaw"
                  name="metadataRaw"
                  type="file"
                  accept="text/xml"
                  className="sr-only"
                  required
                  onChange={(e) => {
                    const f = e.target?.files && e.target?.files[0];
                    setFile(f);
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const content = e.target?.result;
                        setFileContent(content as string);
                      };
                      reader.readAsText(f);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center space-x-1">
                  <h2 className="text-sm font-medium text-neutral-900">
                    {currentProvider.samlModalCopy}
                  </h2>
                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title={`Your ${currentProvider.samlModalCopy} is the URL to your SAML provider's metadata.`}
                        cta="Learn more."
                        href={`https://dub.co/help/article/${selectedProvider}-saml#step-4-copy-the-metadata-url`}
                      />
                    }
                  />
                </div>
                <input
                  id="metadataUrl"
                  name="metadataUrl"
                  autoFocus={!isMobile}
                  type="url"
                  placeholder="https://"
                  autoComplete="off"
                  required
                  className="mt-1 block w-full appearance-none rounded-md border border-neutral-300 px-3 py-2 placeholder-neutral-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
              </div>
            ))}
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
