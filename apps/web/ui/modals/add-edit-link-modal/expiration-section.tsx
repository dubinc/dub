import { LinkProps } from "@/lib/types";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  ExpandingArrow,
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
} from "@dub/ui";
import {
  FADE_IN_ANIMATION_SETTINGS,
  formatDateTime,
  getDateTimeLocal,
  parseDateTime,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

export default function ExpirationSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { expiresAt, expiredUrl } = data;
  const [enabled, setEnabled] = useState(!!expiresAt);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous expiration date if exists
      setData({
        ...data,
        expiresAt: props?.expiresAt || expiresAt,
        expiredUrl: props?.expiredUrl || null,
      });
    } else {
      // if disabling, remove expiration date and expired URL
      setData({ ...data, expiresAt: null, expiredUrl: null });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">Link Expiration</h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Set an expiration date for your links – after which it won't be accessible."
                cta="Learn more."
                href="https://dub.co/help/article/link-expiration"
              />
            }
          />
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div className="mt-3" {...FADE_IN_ANIMATION_SETTINGS}>
          <div className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white shadow-sm transition-all focus-within:border-gray-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-gray-500">
            <input
              ref={inputRef}
              type="text"
              placeholder='E.g. "tomorrow at 5pm" or "in 2 hours"'
              defaultValue={expiresAt ? formatDateTime(expiresAt) : ""}
              onBlur={(e) => {
                if (e.target.value.length > 0) {
                  const parsedDateTime = parseDateTime(e.target.value);
                  if (parsedDateTime) {
                    setData({ ...data, expiresAt: parsedDateTime });
                    e.target.value = formatDateTime(parsedDateTime);
                  }
                }
              }}
              className="flex-1 border-none bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
            />
            <input
              type="datetime-local"
              id="expiresAt"
              name="expiresAt"
              value={expiresAt ? getDateTimeLocal(expiresAt) : ""}
              onChange={(e) => {
                const expiryDate = new Date(e.target.value);
                setData({ ...data, expiresAt: expiryDate });
                if (inputRef.current) {
                  inputRef.current.value = formatDateTime(expiryDate);
                }
              }}
              className="w-[40px] border-none bg-transparent text-gray-500 focus:outline-none focus:ring-0 sm:text-sm"
            />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="expiredUrl"
                className="flex items-center space-x-2"
              >
                <p className="text-sm font-medium text-gray-700">
                  Expiration URL
                </p>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect users to a specific URL when the link has expired."
                      cta="Learn more."
                      href="https://dub.co/help/article/link-expiration#setting-a-custom-expiration-url"
                    />
                  }
                />
              </label>
            </div>
            <div className="mt-3 flex rounded-md shadow-sm">
              <input
                name="expiredUrl"
                id="expiredUrl"
                tabIndex={0}
                placeholder="https://yourwebsite.com"
                value={expiredUrl || ""}
                autoComplete="off"
                onChange={(e) => {
                  setData({ ...data, expiredUrl: e.target.value });
                }}
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                aria-invalid="true"
              />
            </div>
            <a
              href="https://dub.co/help/article/link-expiration#setting-a-default-expiration-url-for-all-links-under-a-domain"
              target="_blank"
              className="group mt-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <p>Or set a default expiration URL for your domain</p>
              <ExpandingArrow />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
