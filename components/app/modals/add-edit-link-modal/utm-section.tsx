import { Dispatch, SetStateAction, useMemo } from "react";
import { LinkProps } from "@/lib/types";
import { constructURLFromUTMParams, getParamsFromURL } from "@/lib/utils";

const paramsMetadata = [
  { display: "UTM Source", key: "utm_source", examples: "twitter, facebook" },
  { display: "UTM Medium", key: "utm_medium", examples: "social, email" },
  { display: "UTM Campaign", key: "utm_campaign", examples: "summer_sale" },
  { display: "UTM Term", key: "utm_term", examples: "blue_shoes" },
  { display: "UTM Content", key: "utm_content", examples: "logolink" },
];

export default function UTMSection({
  data,
  setData,
}: {
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

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900">UTM Builder</h2>
      <div className="mt-1 grid gap-2">
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
      </div>
    </div>
  );
}
