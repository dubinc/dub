import { AlertCircleFill, CheckCircleFill, X } from "@/ui/shared/icons";
import { SimpleTooltipContent, Tooltip, useMediaQuery } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/icons";
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
                  typeof item.enabled === "function" &&
                  item.enabled(data) && {
                    icon: <item.icon className="size-3.5 text-blue-500" />,
                  })}
                onRemove={() =>
                  "remove" in item && typeof item.remove === "function"
                    ? item.remove(setValue)
                    : setValue(item.key as any, false, { shouldDirty: true })
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
    <span className="group flex cursor-default items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 pl-1.5 text-xs text-neutral-600">
      {icon}
      {toggle.label}
      <button
        type="button"
        onClick={onRemove}
        className="-ml-1 p-1 text-neutral-400 hover:text-neutral-500"
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
      ? `/api/links/iframeable?domain=${domain}&url=${debouncedUrl}`
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
          ) : !data ? null : data.iframeable ? (
            <CheckCircleFill className="size-3.5 text-green-500" />
          ) : (
            <AlertCircleFill className="size-3.5 text-amber-500" />
          )
        }
      />
    ),
    [data, isLoading],
  );

  return data ? (
    <Tooltip
      content={
        data.iframeable ? (
          <div className="grid max-w-lg gap-2 text-pretty p-4 text-center text-sm text-neutral-700">
            <div className="h-[250px] w-[444px] overflow-hidden rounded-lg border border-neutral-200">
              <iframe
                src={url}
                style={{
                  zoom: 0.5,
                }}
                className="h-[500px] w-[888px]"
              />
            </div>
            <p>Your link will be successfully cloaked.</p>
          </div>
        ) : (
          <SimpleTooltipContent
            title="Your link is not cloakable – make sure you have the right security headers set on your target URL."
            cta="Learn more"
            href="https://dub.co/help/article/link-cloaking#link-cloaking-with-security-headers"
          />
        )
      }
    >
      <div>{badge}</div>
    </Tooltip>
  ) : (
    badge
  );
}
