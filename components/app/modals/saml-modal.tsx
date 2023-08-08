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
import { ArrowRight, Lock } from "lucide-react";
import { Logo } from "#/ui/icons";
import useProject from "#/lib/swr/use-project";
import { InfoTooltip, SimpleTooltipContent } from "#/ui/tooltip";
import { HOME_DOMAIN } from "#/lib/constants";
import useSAML from "#/lib/swr/use-saml";

function SAMLModal({
  showSAMLModal,
  setShowSAMLModal,
}: {
  showSAMLModal: boolean;
  setShowSAMLModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const { mutate } = useSAML();

  return (
    <Modal showModal={showSAMLModal} setShowModal={setShowSAMLModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="rounded-full border border-gray-200 p-2">
          <Lock className="h-4 w-4 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium">Configure SAML</h3>
        <p className="text-center text-sm text-gray-500">
          Configure SAML for your Dub account.
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
                Metadata URL
              </h2>
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title={`Your Short.io API Key can be found in your Short.io account under "Integrations & API".`}
                    cta="Read the guide."
                    href={`${HOME_DOMAIN}/help/article/migrating-from-short`}
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
          <Button text="Save changes" loading={submitting} />
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
