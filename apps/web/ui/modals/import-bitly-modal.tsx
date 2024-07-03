import useWorkspace from "@/lib/swr/use-workspace";
import { BitlyGroupProps } from "@/lib/types";
import {
  Button,
  LoadingSpinner,
  Logo,
  Modal,
  Switch,
  Tooltip,
  useRouterStuff,
} from "@dub/ui";
import { APP_DOMAIN_WITH_NGROK, fetcher } from "@dub/utils";
import { ArrowRight, ServerOff } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";

function ImportBitlyModal({
  showImportBitlyModal,
  setShowImportBitlyModal,
}: {
  showImportBitlyModal: boolean;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();
  const { id: workspaceId } = useWorkspace();

  const [redirecting, setRedirecting] = useState(false);

  const {
    data: groups,
    isLoading,
    mutate,
  } = useSWRImmutable<BitlyGroupProps[]>(
    workspaceId &&
      showImportBitlyModal &&
      `/api/workspaces/${workspaceId}/import/bitly`,
    fetcher,
    {
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

  useEffect(() => {
    if (searchParams?.get("import") === "bitly") {
      mutate();
      setShowImportBitlyModal(true);
    } else {
      setShowImportBitlyModal(false);
    }
  }, [searchParams]);

  const bitlyOAuthURL = `https://bitly.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_BITLY_CLIENT_ID}&redirect_uri=${APP_DOMAIN_WITH_NGROK}/api/callback/bitly&state=${workspaceId}`;

  const isSelected = (domain: string) => {
    return selectedDomains.find((d) => d.domain === domain) ? true : false;
  };

  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showImportBitlyModal}
      setShowModal={setShowImportBitlyModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
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
          Easily import all your existing Bitly links into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        {isLoading || !workspaceId ? (
          <div className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Connecting to Bitly</p>
          </div>
        ) : groups ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setImporting(true);
              toast.promise(
                fetch(`/api/workspaces/${workspaceId}/import/bitly`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    selectedDomains,
                    selectedGroupTags,
                  }),
                }).then(async (res) => {
                  if (res.ok) {
                    await mutate();
                    router.push(`/${slug}`);
                  } else {
                    setImporting(false);
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
              {groups.length > 0 ? (
                groups.map(({ guid, bsds, tags }) => (
                  <div key={guid} className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        Domains
                      </p>
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
                    {tags?.length > 0 && (
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
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 pb-2">
                  <ServerOff className="h-6 w-6 text-gray-500" />
                  <p className="text-center text-sm text-gray-500">
                    It looks like you don't have any Bitly groups with custom
                    domains (non bit.ly domains).
                  </p>
                </div>
              )}
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
              href="https://dub.co/help/article/migrating-from-bitly"
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
