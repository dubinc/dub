import useWorkspace from "@/lib/swr/use-workspace";
import { ImportedDomainCountProps } from "@/lib/types";
import {
  Button,
  InfoTooltip,
  LoadingSpinner,
  Logo,
  Modal,
  SimpleTooltipContent,
  Switch,
  buttonVariants,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { cn, fetcher, nFormatter } from "@dub/utils";
import { ArrowRight, ServerOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

function ImportShortModal({
  showImportShortModal,
  setShowImportShortModal,
}: {
  showImportShortModal: boolean;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { id: workspaceId, slug } = useWorkspace();
  const searchParams = useSearchParams();

  const {
    data: domains,
    isLoading,
    mutate,
  } = useSWRImmutable<ImportedDomainCountProps[]>(
    workspaceId &&
      showImportShortModal &&
      `/api/workspaces/${workspaceId}/import/short`,
    fetcher,
    {
      onError: (err) => {
        if (err.message !== "No Short.io access token found") {
          toast.error(err.message);
        }
      },
    },
  );

  const [submitting, setSubmitting] = useState(false);

  const [selectedDomains, setSelectedDomains] = useState<
    ImportedDomainCountProps[]
  >([]);

  const [importTags, setImportTags] = useState<boolean>(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (searchParams?.get("import") === "short") {
      mutate();
      setShowImportShortModal(true);
    } else {
      setShowImportShortModal(false);
    }
  }, [searchParams]);

  const isSelected = (domain: string) => {
    return selectedDomains.find((d) => d.domain === domain) ? true : false;
  };

  const { queryParams } = useRouterStuff();

  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showImportShortModal}
      setShowModal={setShowImportShortModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <img
            src="https://assets.dub.co/misc/icons/short.svg"
            alt="Short.io logo"
            className="h-10 w-10"
          />
          <ArrowRight className="h-5 w-5 text-gray-600" />
          <Logo />
        </div>
        <h3 className="text-lg font-medium">Import Your Short.io Links</h3>
        <p className="text-center text-sm text-gray-500">
          Easily import all your existing Short.io links into{" "}
          {process.env.NEXT_PUBLIC_APP_NAME} with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        {isLoading || !workspaceId ? (
          <div className="flex flex-col items-center justify-center space-y-4 bg-none">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Connecting to Short.io</p>
          </div>
        ) : domains ? (
          domains.length > 0 ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setImporting(true);
                toast.promise(
                  fetch(`/api/workspaces/${workspaceId}/import/short`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      selectedDomains,
                      importTags,
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
                <div className="flex items-center justify-between space-x-2 rounded-md py-1 pl-2 pr-4">
                  <p className="text-xs text-gray-500">Import all tags?</p>
                  <Switch
                    fn={() => setImportTags(!importTags)}
                    checked={importTags}
                  />
                </div>
              </div>
              <Button
                text="Confirm import"
                loading={importing}
                disabled={selectedDomains.length === 0}
              />
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <ServerOff className="h-6 w-6 text-gray-500" />
              <p className="max-w-md text-center text-sm text-gray-500">
                We weren't able to retrieve any links from your Short.io
                account.
              </p>
              <a
                href="mailto:support@dub.co?subject=I%20need%20help%20with%20importing%20my%20Short.io%20links"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-8 items-center justify-center rounded-md border px-4 text-sm",
                )}
              >
                Contact Support
              </a>
            </div>
          )
        ) : (
          // form to add API key to redis manually
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              fetch(`/api/workspaces/${workspaceId}/import/short`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  apiKey: e.currentTarget.apiKey.value,
                }),
              }).then(async (res) => {
                if (res.ok) {
                  await mutate();
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
                      href="https://dub.co/help/article/migrating-from-short"
                    />
                  }
                />
              </div>
              <input
                id="apiKey"
                name="apiKey"
                autoFocus={!isMobile}
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
