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
import useProject from "#/lib/swr/use-project";
import Switch from "#/ui/switch";
import Button from "#/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Logo, LoadingSpinner } from "#/ui/icons";
import { ModalContext } from "#/ui/modal-provider";
import useSWR, { mutate } from "swr";
import { BitlyGroupProps } from "#/lib/types";
import Tooltip from "#/ui/tooltip";
import { fetcher } from "#/lib/utils";
import { HOME_DOMAIN } from "#/lib/constants";

function ImportBitlyModal({
  showImportBitlyModal,
  setShowImportBitlyModal,
}: {
  showImportBitlyModal: boolean;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: projectId } = useProject();
  const router = useRouter();
  const { slug, import: importSource } = router.query;

  const [redirecting, setRedirecting] = useState(false);

  const { data: groups, isLoading } = useSWR<BitlyGroupProps[]>(
    slug && showImportBitlyModal && `/api/projects/${slug}/import/bitly`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0,
      onError: (err) => {
        if (err.message !== "No Bitly access token found") {
          toast.error(err.message);
        }
      },
    },
  );

  const [selectedDomains, setSelectedDomains] = useState<
    {
      domain: string;
      bitlyGroup: string;
    }[]
  >([]);
  const [selectedGroupTags, setSelectedGroupTags] = useState<string[]>([]);

  const [importing, setImporting] = useState(false);
  const { setPollLinks } = useContext(ModalContext);

  useEffect(() => {
    if (importSource === "bitly") {
      mutate(`/api/projects/${slug}/import/bitly`);
      setShowImportBitlyModal(true);
    } else {
      setShowImportBitlyModal(false);
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

  const bitlyOAuthURL = `https://bitly.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_BITLY_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_BITLY_REDIRECT_URI}&state=${projectId}`;

  const isSelected = (domain: string) => {
    return selectedDomains.find((d) => d.domain === domain) ? true : false;
  };

  return (
    <Modal
      showModal={showImportBitlyModal}
      setShowModal={setShowImportBitlyModal}
      onClose={() => closeModal(router)}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="/_static/icons/bitly.svg"
            alt="Bitly logo"
            className="h-10 w-10 rounded-full"
          />
          <ArrowRight className="h-5 w-5 text-gray-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import Your Bitly Links</h3>
        <p className="text-center text-sm text-gray-500">
          Easily import all your existing Bitly links into Dub with just a few
          clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        {isLoading ? (
          <button className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Connecting to Bitly</p>
          </button>
        ) : groups ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setImporting(true);
              toast.promise(
                fetch(`/api/projects/${slug}/import/bitly`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    selectedDomains,
                    selectedGroupTags,
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
            <div className="divide-y divide-gray-200">
              {groups.map(({ guid, bsds, tags }) => (
                <div key={guid} className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Domains</p>
                    <Tooltip content="Your Bitly group ID">
                      <p className="cursor-default text-xs uppercase text-gray-400 transition-colors hover:text-gray-700">
                        {guid}
                      </p>
                    </Tooltip>
                  </div>
                  {bsds.map((bsd) => (
                    <div
                      key={bsd}
                      className="flex items-center justify-between space-x-2 rounded-md border border-gray-200 bg-white px-4 py-2"
                    >
                      <p className="font-medium text-gray-800">{bsd}</p>
                      <Switch
                        fn={() => {
                          const selected = isSelected(bsd);
                          if (selected) {
                            setSelectedDomains((prev) =>
                              prev.filter((d) => d.domain !== bsd),
                            );
                          } else {
                            setSelectedDomains((prev) => [
                              ...prev,
                              {
                                domain: bsd,
                                bitlyGroup: guid,
                              },
                            ]);
                          }
                        }}
                        checked={isSelected(bsd)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between space-x-2 rounded-md py-1 pl-2 pr-4">
                    <p className="text-xs text-gray-500">
                      {tags.length} tags found. Import all?
                    </p>
                    <Switch
                      fn={() => {
                        if (selectedGroupTags.includes(guid)) {
                          setSelectedGroupTags((prev) =>
                            prev.filter((g) => g !== guid),
                          );
                        } else {
                          setSelectedGroupTags((prev) => [...prev, guid]);
                        }
                      }}
                      checked={selectedGroupTags.includes(guid)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              text="Confirm import"
              loading={importing}
              disabled={selectedDomains.length === 0}
            />
            <a
              href={bitlyOAuthURL}
              className="text-center text-xs text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-800"
            >
              Sign in to a different Bitly account?
            </a>
          </form>
        ) : (
          <div className="flex flex-col space-y-2">
            <Button
              text="Sign in with Bitly"
              variant="secondary"
              loading={redirecting}
              icon={
                <img
                  src="/_static/icons/bitly.svg"
                  alt="Bitly logo"
                  className="h-5 w-5 rounded-full border border-gray-200"
                />
              }
              onClick={() => {
                setRedirecting(true);
                router.push(bitlyOAuthURL);
              }}
            />
            <a
              href={`${HOME_DOMAIN}/help/article/migrating-from-bitly`}
              target="_blank"
              className="text-center text-xs text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-800"
            >
              Read the guide
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function useImportBitlyModal() {
  const [showImportBitlyModal, setShowImportBitlyModal] = useState(false);

  const ImportBitlyModalCallback = useCallback(() => {
    return (
      <ImportBitlyModal
        showImportBitlyModal={showImportBitlyModal}
        setShowImportBitlyModal={setShowImportBitlyModal}
      />
    );
  }, [showImportBitlyModal, setShowImportBitlyModal]);

  return useMemo(
    () => ({
      setShowImportBitlyModal,
      ImportBitlyModal: ImportBitlyModalCallback,
    }),
    [setShowImportBitlyModal, ImportBitlyModalCallback],
  );
}
