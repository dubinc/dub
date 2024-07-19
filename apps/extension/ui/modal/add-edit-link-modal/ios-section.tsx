import { FADE_IN_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "src/types";
import { SimpleTooltipContent, Switch } from "../../";
import Input from "../../../ui/input";
import { ProBadgeTooltip } from "../../shared/pro-badge-tooltip";

export default function IOSSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { ios } = data;
  const [enabled, setEnabled] = useState(!!ios);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous ios link if exists
      setData({
        ...data,
        ios: props?.ios || ios,
      });
    } else {
      // if disabling, remove ios link
      setData({ ...data, ios: null });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">iOS Targeting</h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Redirect your iOS users to a different link."
                cta="Learn more about device targeting."
                href="https://dub.co/help/article/device-targeting"
              />
            }
          />
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div
          className="mt-3 flex rounded-md shadow-sm"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <Input
            name="ios-url"
            id="ios-url"
            placeholder="https://apps.apple.com/app/1611158928"
            value={ios || ""}
            onChange={(e) => {
              setData({ ...data, ios: e.target.value });
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-5 py-2 text-gray-900 placeholder-gray-400 shadow-none focus:border-gray-500 focus:shadow-lg focus:outline-none focus:ring-gray-500 sm:text-sm"
            aria-invalid="true"
          />
        </motion.div>
      )}
    </div>
  );
}
