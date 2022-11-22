import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { LinkProps } from "@/lib/types";
import { motion } from "framer-motion";
import {
  constructURLFromUTMParams,
  getParamsFromURL,
  paramsMetadata,
  getUrlWithoutUTMParams,
} from "@/lib/utils";
import Switch from "@/components/shared/switch";
import { FADE_IN_ANIMATION_SETTINGS } from "@/lib/constants";

export default function UTMSection({
  props,
  data,
  setData,
}: {
  props: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { url } = data;
  const isValidUrl = useMemo(() => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }, [url]);

  const params = useMemo(() => {
    return getParamsFromURL(url);
  }, [url]);

  const [enabled, setEnabled] = useState(
    paramsMetadata.some((param) => params[param.key]),
  );

  useEffect(() => {
    if (enabled) {
      // if enabling, add all params from props if exists && it's still the same URL
      setData({
        ...data,
        url:
          props?.url &&
          getUrlWithoutUTMParams(props?.url) === getUrlWithoutUTMParams(url)
            ? props?.url
            : url,
      });
    } else {
      // if disabling, remove all UTM params
      setData({ ...data, url: getUrlWithoutUTMParams(url) });
    }
  }, [enabled]);

  return (
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">UTM Builder</h2>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div className="mt-3 grid gap-2" {...FADE_IN_ANIMATION_SETTINGS}>
          {paramsMetadata.map(({ display, key, examples }) => (
            <div key={key} className="relative mt-1 flex rounded-md shadow-sm">
              <span className="flex w-60 items-center justify-center whitespace-nowrap rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-500">
                {display}
              </span>
              <input
                type="text"
                name={key}
                id={key}
                disabled={!isValidUrl}
                className={`${
                  isValidUrl ? "" : "cursor-not-allowed bg-gray-100"
                } block w-full rounded-r-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500`}
                placeholder={examples}
                value={params[key] || ""}
                onChange={(e) => {
                  setData({
                    ...data,
                    url: constructURLFromUTMParams(url, {
                      ...params,
                      [key]: e.target.value,
                    }),
                  });
                }}
              />
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
