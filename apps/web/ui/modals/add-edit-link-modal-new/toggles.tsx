import { AlertCircleFill, CheckCircleFill, X } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  Button,
  Popover,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import {
  Dots,
  Incognito,
  LoadingSpinner,
  SquareChart,
  WindowSearch,
} from "@dub/ui/src/icons";
import { fetcher, isValidUrl as isValidUrlFn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useContext, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import { LinkFormData, LinkModalContext } from ".";

const TOGGLES = [
  {
    key: "rewrite",
    icon: Incognito,
    label: "Link Cloaking",
    description:
      "Mask your destination URL so your users only see the short link in the browser address bar.",
    learnMoreUrl: "https://dub.co/help/article/link-cloaking",
    shortcutKey: "l",
    badge: LinkCloakingToggleBadge,
  },
  {
    key: "trackConversion",
    icon: SquareChart,
    label: "Conversion Tracking",
    description:
      "Track conversions on your short link to measure the effectiveness of your marketing campaigns.",
    learnMoreUrl: "https://dub.co/help/article/conversion-tracking",
    shortcutKey: "c",
    conversionEnabled: true,
  },
  {
    key: "doIndex",
    icon: WindowSearch,
    label: "Search Engine Indexing",
    description:
      "Allow search engines to index your short link. Disabled by default.",
    learnMoreUrl: "https://dub.co/help/article/how-noindex-works",
    shortcutKey: "s",
  },
];

export function TogglesDropdown() {
  const { conversionEnabled } = useContext(LinkModalContext);

  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const [openPopover, setOpenPopover] = useState(false);

  const toggles = useMemo(
    () =>
      TOGGLES.filter((toggle) =>
        toggle.conversionEnabled ? conversionEnabled || data[toggle.key] : true,
      ),
    [conversionEnabled, data],
  );

  useKeyboardShortcut(
    toggles.map(({ shortcutKey }) => shortcutKey),
    (e) => {
      const toggle = toggles.find(({ shortcutKey }) => shortcutKey === e.key);
      if (!toggle) return;

      setOpenPopover(false);
      setValue(toggle.key as any, !data[toggle.key]);
    },
    { modal: true },
  );

  return (
    <Popover
      align="start"
      content={
        <div className="grid p-1 max-sm:w-full md:min-w-72">
          {toggles.map((toggle) => {
            const enabled = data[toggle.key];

            return (
              <Button
                type="button"
                variant="outline"
                key={toggle.key}
                onClick={() => {
                  setOpenPopover(false);
                  setValue(toggle.key as any, !enabled);
                }}
                className="h-9 w-full justify-start px-2 text-sm text-gray-700"
                textWrapperClassName="grow"
                text={
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <toggle.icon className="mr-1 size-4 text-gray-950" />
                      {enabled ? "Remove" : "Add"} {toggle.label}
                      <ProBadgeTooltip
                        content={
                          <SimpleTooltipContent
                            title={toggle.description}
                            cta="Learn more."
                            href={toggle.learnMoreUrl}
                          />
                        }
                      />
                    </div>
                    <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-gray-200 font-sans text-xs text-gray-800">
                      {toggle.shortcutKey.toUpperCase()}
                    </kbd>
                  </div>
                }
              />
            );
          })}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="secondary"
        icon={<Dots className="size-4" />}
        className="h-9 px-2.5"
      />
    </Popover>
  );
}

export function TogglesList() {
  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const enabledToggles = useMemo(
    () => TOGGLES.filter(({ key }) => data[key]),
    [data],
  );

  return enabledToggles.length ? (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {enabledToggles.map((toggle) => {
          const Component = toggle.badge || ToggleBadge;
          return (
            <motion.div
              key={toggle.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
              <Component
                toggle={toggle}
                onRemove={() => setValue(toggle.key as any, false)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  ) : null;
}

function ToggleBadge({
  toggle,
  onRemove,
  icon,
}: {
  toggle: (typeof TOGGLES)[number];
  onRemove: () => void;
  icon?: ReactNode;
}) {
  return (
    <span className="group flex cursor-default items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 pl-1.5 text-xs text-gray-600">
      {icon}
      {toggle.label}
      <button
        type="button"
        onClick={onRemove}
        className="-ml-1 p-1 text-gray-400 hover:text-gray-500"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

function LinkCloakingToggleBadge({
  toggle,
  onRemove,
}: {
  toggle: (typeof TOGGLES)[number];
  onRemove: () => void;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const [url, domain] = watch(["url", "domain"]);
  const [debouncedUrl] = useDebounce(url, 500);
  const isValidUrl = useMemo(
    () => debouncedUrl && isValidUrlFn(debouncedUrl),
    [debouncedUrl],
  );

  const { data, isLoading } = useSWR<{ iframeable: boolean }>(
    domain && isValidUrl
      ? `/api/links/iframeable?url=${debouncedUrl}&domain=${domain}`
      : null,
    fetcher,
  );

  const badge = useMemo(
    () => (
      <ToggleBadge
        toggle={toggle}
        onRemove={onRemove}
        icon={
          isLoading ? (
            <LoadingSpinner className="size-3.5" />
          ) : !data ? null : data?.iframeable ? (
            <CheckCircleFill className="size-3.5 text-green-500" />
          ) : (
            <AlertCircleFill className="size-3.5 text-yellow-500" />
          )
        }
      />
    ),
    [data, isLoading],
  );

  return data && !data?.iframeable ? (
    <Tooltip
      content={
        <div className="block max-w-sm text-pretty px-4 py-2 text-center text-sm text-gray-700">
          We will try to cloak it with{" "}
          <a
            href="https://nextjs.org/docs/pages/api-reference/functions/next-response#rewrite"
            target="_blank"
            className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
          >
            Next.js Rewrites
          </a>
          , but it might not work as expected.{" "}
          <a
            href="https://dub.co/help/article/link-cloaking"
            target="_blank"
            className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
          >
            Learn more.
          </a>
        </div>
      }
    >
      <div>{badge}</div>
    </Tooltip>
  ) : (
    badge
  );
}
