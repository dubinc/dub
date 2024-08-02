import { LinkProps } from "@/lib/types";
import { InfoTooltip, SimpleTooltipContent, Switch } from "@dub/ui";
import {
  FADE_IN_ANIMATION_SETTINGS,
  UTMTags,
  constructURLFromUTMParams,
  getParamsFromURL,
  getUrlWithoutUTMParams,
  paramsMetadata,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

export default function UTMSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
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
      setData({
        ...data,
        ...UTMTags.reduce((acc, tag) => {
          acc[tag] = null;
          return acc;
        }, {}),
        url: getUrlWithoutUTMParams(url),
      });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">UTM Builder</h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Add UTM parameters to your short links for conversion tracking."
                cta="Learn more."
                href="https://dub.co/help/article/utm-builder"
              />
            }
          />
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div className="mt-3 grid gap-2" {...FADE_IN_ANIMATION_SETTINGS}>
          {paramsMetadata.map(({ display, key, examples }) => (
            <div key={key} className="relative mt-1 flex rounded-md shadow-sm">
              <span className="flex w-60 items-center justify-center whitespace-nowrap rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                {display}
              </span>
              <input
                type="text"
                name={key}
                id={key}
                disabled={!isValidUrl}
                className={`${
                  isValidUrl ? "" : "cursor-not-allowed bg-gray-100"
                } block w-full rounded-r-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm`}
                placeholder={examples}
                value={params[key] || ""}
                onChange={(e) => {
                  setData({
                    ...data,
                    [key]: e.target.value,
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
