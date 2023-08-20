import { NextRouter, useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Modal from "#/ui/modal";
import Switch from "#/ui/switch";
import Button from "#/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Logo, LoadingSpinner } from "#/ui/icons";
import { ModalContext } from "#/ui/modal-provider";
import useSWR, { mutate } from "swr";
import { ShortioDomainProps } from "#/lib/types";
import { InfoTooltip, SimpleTooltipContent } from "#/ui/tooltip";
import { fetcher, nFormatter } from "#/lib/utils";
import { HOME_DOMAIN } from "#/lib/constants";

function ImportShortModal({
  showImportShortModal,
  setShowImportShortModal,
}: {
  showImportShortModal: boolean;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug, import: importSource } = router.query;

  const { data: domains, isLoading } = useSWR<ShortioDomainProps[]>(
    slug && showImportShortModal && `/api/projects/${slug}/import/short`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0,
      onError: (err) => {
        if (err.message !== "No Short.io access token found") {
          toast.error(err.message);
        }
      },
    },
  );

  const [submitting, setSubmitting] = useState(false);

  const [selectedDomains, setSelectedDomains] = useState<ShortioDomainProps[]>(
    [],
  );

  const [importing, setImporting] = useState(false);
  const { setPollLinks } = useContext(ModalContext);

  useEffect(() => {
    if (importSource === "short") {
      mutate(`/api/projects/${slug}/import/short`);
      setShowImportShortModal(true);
    } else {
      setShowImportShortModal(false);
    }
  }, [importSource]);

  const closeModal = (router: NextRouter) => {
    delete router.query.import;
    // here, we omit the slug from the query string as well
    const { slug, ...finalQuery } = router.query;
    router.push({
      pathname: `/${router.query.slug}`,
      query: finalQuery,
    });
  };

  const isSelected = (domain: string) => {
    return selectedDomains.find((d) => d.domain === domain) ? true : false;
  };

  return (
    <Modal
      showModal={showImportShortModal}
      setShowModal={setShowImportShortModal}
      onClose={() => closeModal(router)}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="/_static/icons/short.svg"
            alt="Short.io logo"
            className="h-10 w-10"
          />
          <ArrowRight className="h-5 w-5 text-gray-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import Your Short.io Links</h3>
        <p className="text-center text-sm text-gray-500">
          Easily import all your existing Short.io links into Dub with just a
          few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        {isLoading ? (
          <button className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Connecting to Short.io</p>
          </button>
        ) : domains ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setImporting(true);
              toast.promise(
                fetch(`/api/projects/${slug}/import/short`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    selectedDomains,
                  }),
                }).then((res) => {
                  setImporting(false);
                  if (res.ok) {
                    closeModal(router);
                    mutate(`/api/projects/${slug}/domains`);
                    setPollLinks(true);
                  } else {
                    throw new Error();
                  }
                }),
                {
                  loading: "Adding links to import queue...",
                  success:
                    "Successfully added links to import queue! You can now safely navigate from this tab – we will send you an email when your links have been fully imported.",
                  error: "Error adding links to import queue",
                },
              );
            }}
            className="flex flex-col space-y-4"
          >
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-gray-700">Domains</p>
              {domains.map(({ id, domain, links }) => (
                <div className="flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white px-4 py-2">
                  <div>
                    <p className="font-medium text-gray-800">{domain}</p>
                    {links > 0 && (
                      <p className="text-xs text-gray-500">
                        {nFormatter(links)} links found
                      </p>
                    )}
                  </div>
                  <Switch
                    fn={() => {
                      const selected = isSelected(domain);
                      if (selected) {
                        setSelectedDomains((prev) =>
                          prev.filter((d) => d.domain !== domain),
                        );
                      } else {
                        setSelectedDomains((prev) => [
                          ...prev,
                          {
                            id,
                            domain,
                            links,
                          },
                        ]);
                      }
                    }}
                    checked={isSelected(domain)}
                  />
                </div>
              ))}
            </div>
            <Button
              text="Confirm import"
              loading={importing}
              disabled={selectedDomains.length === 0}
            />
          </form>
        ) : (
          // form to add API key to redis manually
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              fetch(`/api/projects/${slug}/import/short`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  apiKey: e.currentTarget.apiKey.value,
                }),
              }).then((res) => {
                if (res.ok) {
                  mutate(`/api/projects/${slug}/import/short`);
                  toast.success("Successfully added API key");
                } else {
                  toast.error("Error adding API key");
                }
                setSubmitting(false);
              });
            }}
            className="flex flex-col space-y-4"
          >
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">
                  Short.io API Key
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
                id="apiKey"
                name="apiKey"
                autoFocus
                type="text"
                placeholder="sk_xxxxxxxxxxxxxxxx"
                autoComplete="off"
                required
                className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
              />
            </div>
            <Button text="Confirm API Key" loading={submitting} />
          </form>
        )}
      </div>
    </Modal>
  );
}

export function useImportShortModal() {
  const [showImportShortModal, setShowImportShortModal] = useState(false);

  const ImportShortModalCallback = useCallback(() => {
    return (
      <ImportShortModal
        showImportShortModal={showImportShortModal}
        setShowImportShortModal={setShowImportShortModal}
      />
    );
  }, [showImportShortModal, setShowImportShortModal]);

  return useMemo(
    () => ({
      setShowImportShortModal,
      ImportShortModal: ImportShortModalCallback,
    }),
    [setShowImportShortModal, ImportShortModalCallback],
  );
}
