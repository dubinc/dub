import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "#/lib/types";
import Switch from "#/ui/switch";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "#/lib/constants";
import Tooltip from "#/ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function AndroidSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { android } = data;
  const [enabled, setEnabled] = useState(!!android);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous android link if exists
      setData({
        ...data,
        android: props?.android || android,
      });
    } else {
      // if disabling, remove android link
      setData({ ...data, android: null });
    }
  }, [enabled]);

  return (
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Android Targeting
          </h2>
          <Tooltip content="Redirect your Android users to a different link (e.g. Google Play Store link for your app).">
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
            name="android-url"
            id="android-url"
            type="url"
            placeholder="https://play.google.com/store/apps/details?id=com.disney.disneyplus"
            value={android || ""}
            onChange={(e) => {
              setData({ ...data, android: e.target.value });
            }}
            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            aria-invalid="true"
          />
        </motion.div>
      )}
    </div>
  );
}
