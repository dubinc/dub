import useWorkspace from "@/lib/swr/use-workspace";
import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import {
  Button,
  CursorRays,
  InvoiceDollar,
  Modal,
  Tooltip,
  UserCheck,
} from "@dub/ui";
import { cn, currencyFormatter, fetcher, nFormatter } from "@dub/utils";
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

// Analytics groups by base URL with a trailing slash (e.g. "https://dub.co/"),
// while test variants store the URL without one
const normalizeUrl = (url: string) => url.replace(/\/$/, "");

function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => setTruncated(el.scrollWidth > el.clientWidth);
    check();

    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  return { ref, truncated };
}

function VariantStats({
  clicks,
  leads,
  saleAmount,
}: {
  clicks: number;
  leads: number;
  saleAmount: number;
}) {
  const stats = [
    {
      id: "clicks",
      icon: CursorRays,
      value: clicks,
      iconClassName: "data-[active=true]:text-blue-500",
    },
    {
      id: "leads",
      icon: UserCheck,
      value: leads,
      iconClassName: "data-[active=true]:text-purple-500",
    },
    {
      id: "sales",
      icon: InvoiceDollar,
      value: saleAmount,
      iconClassName: "data-[active=true]:text-teal-500",
    },
  ];

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-sm text-neutral-600">
      {stats.map(({ id, icon: Icon, value, iconClassName }) => (
        <div
          key={id}
          className="flex items-center gap-1 whitespace-nowrap rounded-md px-1 py-px"
        >
          <Icon
            data-active={value > 0}
            className={cn("h-4 w-4 shrink-0", iconClassName)}
          />
          <span>
            {id === "sales"
              ? currencyFormatter(value, {
                  // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                  trailingZeroDisplay: "stripIfInteger",
                })
              : nFormatter(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function VariantOption({
  test,
  selected,
  onSelect,
  analytics,
  isLoading,
}: {
  test: { url: string; percentage: number };
  selected: boolean;
  onSelect: () => void;
  analytics?: { clicks: number; leads: number; saleAmount: number };
  isLoading: boolean;
}) {
  const { ref, truncated } = useIsTruncated<HTMLSpanElement>();

  return (
    <button
      onClick={onSelect}
      className={`relative flex w-full items-center gap-3 rounded-md border bg-white p-2.5 text-left ring-0 ring-black transition-all duration-100 hover:bg-neutral-50 ${
        selected ? "border-black ring-1" : "border-neutral-300"
      }`}
    >
      <div
        className={`size-4 shrink-0 rounded-full border transition-all ${
          selected ? "border-4 border-black" : "border-neutral-400"
        }`}
      />
      <Tooltip
        disabled={!truncated}
        content={
          <div className="max-w-xs break-all px-3 py-2 text-sm text-neutral-700">
            {test.url}
          </div>
        }
      >
        <span ref={ref} className="min-w-0 grow truncate text-sm font-medium">
          {test.url}
        </span>
      </Tooltip>
      {isLoading ? (
        <div className="h-6 w-32 shrink-0 animate-pulse rounded-md bg-neutral-100" />
      ) : (
        <VariantStats
          clicks={analytics?.clicks ?? 0}
          leads={analytics?.leads ?? 0}
          saleAmount={analytics?.saleAmount ?? 0}
        />
      )}
    </button>
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
  const { watch: watchParent, setValue: setValueParent } =
    useFormContext<LinkFormData>();

  const testVariants = watchParent("testVariants") as Array<{
    url: string;
    percentage: number;
  }> | null;
  const [linkId, testStartedAt] = watchParent(["id", "testStartedAt"]);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const { data: analyticsData, isLoading } = useSWR<
    {
      url: string;
      clicks: number;
      leads: number;
      saleAmount: number;
      sales: number;
    }[]
  >(
    Boolean(showEndABTestingModal && linkId && workspaceId) &&
      `/api/analytics?${new URLSearchParams({
        event: "composite",
        groupBy: "top_base_urls",
        linkId: linkId as string,
        workspaceId: workspaceId!,
        ...(testStartedAt && {
          start: new Date(testStartedAt).toISOString(),
        }),
      }).toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return (
    <Modal
      showModal={showEndABTestingModal}
      setShowModal={setShowEndABTestingModal}
      className="sm:max-w-md"
    >
      <div className="p-4">
        <h3 className="text-lg font-medium">End A/B test</h3>

        <div className="mt-4">
          <p className="text-sm text-neutral-600">
            Select the new destination URL to end the test. Save your changes on
            the link editor to confirm the change.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {testVariants?.map((test, index) => (
              <VariantOption
                key={index}
                test={test}
                selected={selectedUrl === test.url}
                onSelect={() => setSelectedUrl(test.url)}
                analytics={analyticsData?.find(
                  ({ url }) => normalizeUrl(url) === normalizeUrl(test.url),
                )}
                isLoading={isLoading}
              />
            ))}
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
                // Set testCompletedAt before url so the destination URL <->
                // first variant sync sees the test as completed and doesn't
                // overwrite testVariants[0].url with the selected winner
                setValueParent("testCompletedAt", new Date(), {
                  shouldDirty: true,
                });
                setValueParent("url", selectedUrl, { shouldDirty: true });
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
