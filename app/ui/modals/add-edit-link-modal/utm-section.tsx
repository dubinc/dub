import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { type Link as LinkProps } from "@prisma/client";
import { motion } from "framer-motion";
import {
  constructURLFromUTMParams,
  getParamsFromURL,
  paramsMetadata,
  getUrlWithoutUTMParams,
} from "#/lib/utils";
import Switch from "#/ui/switch";
import { FADE_IN_ANIMATION_SETTINGS, HOME_DOMAIN } from "#/lib/constants";
import { InfoTooltip, SimpleTooltipContent } from "#/ui/tooltip";

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
      setData({ ...data, url: getUrlWithoutUTMParams(url) });
    }
  }, [enabled]);

  return (
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">UTM Builder</h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Add UTM parameters to your short links for conversion tracking."
                cta="Learn more."
                href={`${HOME_DOMAIN}/help/article/how-to-create-link#utm-builder`}
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
                } block w-full rounded-r-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm`}
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
