import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "@/lib/types";
import { getDateTimeLocal } from "@/lib/utils";
import Switch from "@/components/shared/switch";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "@/lib/constants";

export default function ExpirationSection({
  props,
  data,
  setData,
}: {
  props: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { expiresAt } = data;
  const [enabled, setEnabled] = useState(!!expiresAt);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous expiration date if exists
      setData({
        ...data,
        expiresAt: props?.expiresAt || expiresAt,
      });
    } else {
      // if disabling, remove expiration date
      setData({ ...data, expiresAt: null });
    }
  }, [enabled]);

  return (
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Expiration Date</h2>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div className="mt-3">
          <input
            type="datetime-local"
            id="expiresAt"
            name="expiresAt"
            min={getDateTimeLocal()}
            value={expiresAt ? getDateTimeLocal(expiresAt) : ""}
            step="60" // need to add step to prevent weird date bug (https://stackoverflow.com/q/19284193/10639526)
            onChange={(e) => {
              setData({ ...data, expiresAt: new Date(e.target.value) });
            }}
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 shadow-sm transition-all hover:border-gray-800 focus:border-gray-800 focus:outline-none focus:ring-gray-500"
          />
        </motion.div>
      )}
    </div>
  );
}
