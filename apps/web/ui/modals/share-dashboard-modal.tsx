import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import {
  AnimatedSizeContainer,
  Copy,
  LinkLogo,
  Modal,
  Switch,
  Tick,
  useCopyToClipboard,
} from "@dub/ui";
import { ArrowTurnRight2, Globe, LoadingSpinner } from "@dub/ui/src/icons";
import {
  APP_DOMAIN,
  fetcher,
  getApexDomain,
  getPrettyUrl,
  linkConstructor,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

interface ShareDashboardModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  domain: string;
  _key: string;
}

function ShareDashboardModal(props: ShareDashboardModalProps) {
  return (
    <Modal {...props}>
      <ShareDashboardModalInner {...props} />
    </Modal>
  );
}

function ShareDashboardModalInner({
  domain,
  _key: key,
}: ShareDashboardModalProps) {
  const { id: workspaceId } = useWorkspace();
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: link, error: linkError } = useSWR<LinkProps>(
    workspaceId && domain && key
      ? `/api/links/info?${new URLSearchParams({ workspaceId, domain, key }).toString()}`
      : undefined,
    fetcher,
  );

  const { data, mutate } = useSWR<{ id: string }>(
    link?.id
      ? `/api/links/${link.id}/dashboard?workspaceId=${workspaceId}`
      : undefined,
    fetcher,
    {
      onSuccess: (data) => setChecked(Boolean(data)),
    },
  );

  const [isCreating, setIsCreating] = useState(false);
  const [copied, copyToClipboard] = useCopyToClipboard();

  const handleCreate = async () => {
    if (!workspaceId) {
      return;
    }

    setChecked(true);
    setIsCreating(true);

    const res = await fetch(
      `/api/dashboards?${new URLSearchParams({ workspaceId, domain, key }).toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (res.ok) {
      const data = await res.json();
      await mutate();

      toast.promise(copyToClipboard(`${APP_DOMAIN}/share/${data.id}`), {
        success:
          "Successfully created shared dashboard! Copied link to clipboard.",
      });
    } else {
      toast.error("Failed to create shared dashboard");
      setChecked(false);
    }

    setIsCreating(false);
  };

  const handleRemove = async () => {
    if (!data) {
      return;
    }

    if (
      !confirm(
        "Are you sure you want to remove the shared dashboard? Your existing dashboard link will break and you'll have to create a new one.",
      )
    ) {
      return;
    }

    setChecked(false);
    setIsRemoving(true);

    const res = await fetch(
      `/api/dashboards/${data.id}?workspaceId=${workspaceId}`,
      {
        method: "DELETE",
      },
    );

    if (res.ok) {
      await mutate();
      toast.success("Removed shared dashboard.");
    } else {
      toast.error("Failed to remove shared dashboard.");
      setChecked(true);
    }

    setIsRemoving(false);
  };

  const [checked, setChecked] = useState(Boolean(data));

  return (
    <>
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        Share dashboard
      </h3>
      <div className="px-6 pb-6 pt-4">
        <LinkCard link={link} isError={Boolean(linkError)} />
        <AnimatedSizeContainer
          height
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {data !== undefined ? (
            <>
              <label className="flex cursor-pointer items-center justify-between gap-2 pt-6">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="size-4" />
                  Enable public sharing
                </span>
                <Switch
                  checked={checked}
                  fn={(checked) => (checked ? handleCreate() : handleRemove())}
                  disabled={isRemoving || isCreating}
                />
              </label>
              {checked &&
                (data ? (
                  <div className="pt-6 text-sm">
                    <div className="divide-x-200 flex items-center justify-between divide-x overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      <div className="scrollbar-hide overflow-scroll pl-3">
                        <p className="whitespace-nowrap text-gray-400">
                          {getPrettyUrl(`${APP_DOMAIN}/share/${data.id}`)}
                        </p>
                      </div>
                      <button
                        className="flex h-8 items-center gap-2 whitespace-nowrap border-l bg-white px-3 hover:bg-gray-50 active:bg-gray-100"
                        onClick={() => {
                          const url = `${APP_DOMAIN}/share/${data.id}`;
                          toast.promise(copyToClipboard(url), {
                            success: "Copied to clipboard",
                          });
                        }}
                      >
                        {copied ? (
                          <Tick className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                        Copy link
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full justify-center pt-6">
                    <LoadingSpinner className="size-4" />
                  </div>
                ))}
            </>
          ) : (
            <div className="flex w-full items-center justify-between pt-6">
              <div className="h-5 w-36 animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-12 animate-pulse rounded-md bg-gray-200" />
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </>
  );
}

function LinkCard({
  link,
  isError,
}: {
  link: LinkProps | undefined;
  isError: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white p-3">
      {isError ? (
        <span className="text-sm text-gray-400">Failed to load link</span>
      ) : link === undefined ? (
        <>
          <div className="m-px size-9 animate-pulse rounded-full bg-gray-200" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-24 max-w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-32 max-w-full animate-pulse rounded-md bg-gray-200" />
          </div>
        </>
      ) : (
        <>
          <div className="relative flex shrink-0 items-center justify-center rounded-full border border-gray-200">
            {/* Background gradient + white border */}
            <div className="absolute inset-0 rounded-full border border-white bg-gradient-to-t from-gray-100" />
            <div className="shrink-0 p-2">
              <LinkLogo
                apexDomain={link ? getApexDomain(link?.url) : ""}
                className="size-5 sm:size-5"
                imageProps={{
                  loading: "lazy",
                }}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col text-sm">
            {link && (
              <span className="truncate font-semibold leading-6 text-gray-800">
                {linkConstructor({
                  domain: link.domain,
                  key: link.key,
                  pretty: true,
                })}
              </span>
            )}
            <div className="flex items-center gap-1">
              <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-gray-400" />
              {link?.url ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.url}
                  className="truncate text-gray-500 transition-colors hover:text-gray-700 hover:underline hover:underline-offset-2"
                >
                  {getPrettyUrl(link.url)}
                </a>
              ) : (
                <span className="truncate text-gray-400">
                  No URL configured
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function useShareDashboardModal(
  props: Pick<ShareDashboardModalProps, "domain" | "_key">,
) {
  const [showShareDashboardModal, setShowShareDashboardModal] = useState(false);

  const ShareDashboardModalCallback = useCallback(() => {
    return (
      <ShareDashboardModal
        showModal={showShareDashboardModal}
        setShowModal={setShowShareDashboardModal}
        {...props}
      />
    );
  }, [showShareDashboardModal, setShowShareDashboardModal, props]);

  return useMemo(
    () => ({
      setShowShareDashboardModal,
      ShareDashboardModal: ShareDashboardModalCallback,
    }),
    [setShowShareDashboardModal, ShareDashboardModalCallback],
  );
}
