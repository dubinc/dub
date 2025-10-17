import useWorkspace from "@/lib/swr/use-workspace";
import { LinkAnalyticsBadge } from "@/ui/links/link-analytics-badge";
import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { Button, Modal, Tooltip } from "@dub/ui";
import { fetcher, normalizeUrl } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";

function UrlWithTooltip({ url }: { url: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, [url]);

  const content = (
    <span
      ref={textRef}
      className="min-w-0 truncate text-sm font-medium text-neutral-800"
    >
      {url}
    </span>
  );

  if (!isOverflowing) return content;

  return (
    <Tooltip
      content={
        <div className="max-w-xs break-all px-2 py-1 text-xs">{url}</div>
      }
    >
      {content}
    </Tooltip>
  );
}

function EndABTestingModal({
  showEndABTestingModal,
  setShowEndABTestingModal,
  onEndTest,
}: {
  showEndABTestingModal: boolean;
  setShowEndABTestingModal: Dispatch<SetStateAction<boolean>>;
  onEndTest?: () => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const {
    watch: watchParent,
    setValue: setValueParent,
    getValues: getValuesParent,
  } = useFormContext<LinkFormData>();

  const testVariants = watchParent("testVariants") as Array<{
    url: string;
    percentage: number;
  }> | null;

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const [linkId, testStartedAt] = watchParent(["id", "testStartedAt"]);

  const { data, error, isLoading } = useSWR<
    {
      url: string;
      clicks: number;
      leads: number;
      saleAmount: number;
      sales: number;
    }[]
  >(
    Boolean(testVariants && testVariants.length && linkId && workspaceId) &&
      `/api/analytics?${new URLSearchParams({
        event: "composite",
        groupBy: "top_urls",
        linkId: linkId as string,
        workspaceId: workspaceId!,
        ...(testStartedAt && {
          start: new Date(testStartedAt as Date).toISOString(),
        }),
      }).toString()}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const analyticsByNormalizedUrl = useMemo(() => {
    if (!data) return null;
    const map = new Map<
      string,
      { clicks: number; leads: number; sales: number; saleAmount: number }
    >();
    for (const row of data) {
      const key = normalizeUrl(row.url);
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          clicks: existing.clicks + (row.clicks ?? 0),
          leads: existing.leads + (row.leads ?? 0),
          sales: existing.sales + (row.sales ?? 0),
          saleAmount: existing.saleAmount + (row.saleAmount ?? 0),
        });
      } else {
        map.set(key, {
          clicks: row.clicks ?? 0,
          leads: row.leads ?? 0,
          sales: row.sales ?? 0,
          saleAmount: row.saleAmount ?? 0,
        });
      }
    }
    return map;
  }, [data]);

  return (
    <Modal
      showModal={showEndABTestingModal}
      setShowModal={setShowEndABTestingModal}
      className="sm:max-w-md"
    >
      <div className="p-4">
        <h3 className="text-lg font-medium">End A/B test</h3>

        <div className="mt-2">
          <p className="text-sm text-neutral-600">
            Select the new destination URL to end the test. Save your changes on
            the link editor to confirm the change.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {testVariants?.map((test, index) => {
              const normalized = normalizeUrl(test.url);
              const analytics = analyticsByNormalizedUrl?.get(normalized);
              const link = getValuesParent();
              return (
                <button
                  key={index}
                  onClick={() => setSelectedUrl(test.url)}
                  className={`relative flex w-full items-center justify-between rounded-lg border bg-white p-0 text-left ring-0 ring-black transition-all duration-100 hover:bg-neutral-50 ${
                    selectedUrl === test.url
                      ? "border-black ring-1"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-1 py-1">
                    <div className="flex size-8 shrink-0 items-center justify-center">
                      <div
                        className={`size-4 rounded-full border transition-all ${
                          selectedUrl === test.url
                            ? "border-4 border-black"
                            : "border-neutral-400"
                        }`}
                      />
                    </div>
                    <UrlWithTooltip url={test.url} />
                  </div>
                  <div className="flex shrink-0 items-center pr-1">
                    {isLoading || !analyticsByNormalizedUrl ? (
                      <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-100" />
                    ) : error ? null : (
                      <LinkAnalyticsBadge
                        link={{
                          ...(link as any),
                          clicks: analytics?.clicks ?? 0,
                          leads: analytics?.leads ?? 0,
                          sales: analytics?.sales ?? 0,
                          saleAmount: analytics?.saleAmount ?? 0,
                        }}
                        url={test.url}
                        sharingEnabled={false}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-9 flex justify-end gap-2">
          <Button
            text="Cancel"
            variant="secondary"
            className="h-9 w-fit"
            onClick={() => {
              setSelectedUrl(null);
              setShowEndABTestingModal(false);
            }}
          />
          <Button
            text="End test"
            variant="primary"
            className="h-9 w-fit"
            disabled={!selectedUrl}
            onClick={() => {
              if (selectedUrl) {
                setValueParent("url", selectedUrl, { shouldDirty: true });
                setValueParent("testCompletedAt", new Date(), {
                  shouldDirty: true,
                });
                setShowEndABTestingModal(false);
                onEndTest?.();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useEndABTestingModal({
  onEndTest,
}: {
  onEndTest?: () => void;
} = {}) {
  const [showEndABTestingModal, setShowEndABTestingModal] = useState(false);

  const EndABTestingModalCallback = useCallback(() => {
    return (
      <EndABTestingModal
        showEndABTestingModal={showEndABTestingModal}
        setShowEndABTestingModal={setShowEndABTestingModal}
        onEndTest={onEndTest}
      />
    );
  }, [showEndABTestingModal, setShowEndABTestingModal]);

  return useMemo(
    () => ({
      setShowEndABTestingModal,
      EndABTestingModal: EndABTestingModalCallback,
    }),
    [setShowEndABTestingModal, EndABTestingModalCallback],
  );
}
