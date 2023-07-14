import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "#/lib/types";
import Switch from "#/ui/switch";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "#/lib/constants";
import Tooltip from "#/ui/tooltip";
import { HelpCircle } from "lucide-react";

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
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">iOS Targeting</h2>
          <Tooltip content="Redirect your iOS users to a different link (e.g. App Store link for your app).">
            <HelpCircle className="h-4 w-4 text-gray-600" />
          </Tooltip>
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div
          className="mt-3 flex rounded-md shadow-sm"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <input
            name="ios-url"
            id="ios-url"
            type="url"
            placeholder="https://apps.apple.com/app/1611158928"
            value={ios || ""}
            onChange={(e) => {
              setData({ ...data, ios: e.target.value });
            }}
            className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            aria-invalid="true"
          />
        </motion.div>
      )}
    </div>
  );
}
