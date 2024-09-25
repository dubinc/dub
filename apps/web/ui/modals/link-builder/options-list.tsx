import { AlertCircleFill, CheckCircleFill, X } from "@/ui/shared/icons";
import { Tooltip, useMediaQuery } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { fetcher, isValidUrl as isValidUrlFn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import { LinkFormData } from ".";
import { MOBILE_MORE_ITEMS, TOGGLES } from "./constants";

export function OptionsList() {
  const { isMobile } = useMediaQuery();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const enabledToggles = useMemo(
    () => TOGGLES.filter(({ key }) => data[key]),
    [data],
  );

  const enabledItems = useMemo(
    () => [
      ...enabledToggles,
      ...(isMobile
        ? MOBILE_MORE_ITEMS.filter(({ enabled }) => enabled(data)).map(
            (item) => ({ ...item, label: item.badgeLabel(data) }),
          )
        : []),
    ],
    [enabledToggles, isMobile, data],
  );

  return enabledItems.length ? (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {enabledItems.map((item) => {
          const Component =
            item.key === "rewrite" ? LinkCloakingToggleBadge : ToggleBadge;
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
              <Component
                toggle={item}
                {...(item.type === "modal" &&
                  "enabled" in item &&
                  item.enabled(data) && {
                    icon: <item.icon className="size-3.5 text-blue-500" />,
                  })}
                onRemove={() =>
                  "remove" in item
                    ? item.remove(setValue)
                    : setValue(item.key as any, false)
                }
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
