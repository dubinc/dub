import { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { X } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { getDateTimeLocal } from "@/lib/utils";
import { AnimationSettings } from "./advanced-settings";

export default function ExpirationSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { expiresAt } = data;
  return (
    <motion.div key="expire" {...AnimationSettings}>
      <div>
        <label htmlFor="expiresAt" className="my-2 block text-sm text-gray-500">
          Automatically expires your link at a given date and time. Your link
          will be disabled but the data will still be kept.
        </label>
        <div className="mb-3 flex space-x-2">
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
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-3 py-2 text-gray-500 shadow-sm transition-all hover:border-gray-800 focus:outline-none sm:text-sm"
          />
          <button
            onClick={() => setData({ ...data, expiresAt: null })}
            type="button"
            className="group flex h-10 w-10 items-center justify-center rounded-md border text-gray-500 transition-all hover:border-gray-800 hover:text-gray-800 focus:outline-none"
          >
            <X className="h-4 w-4 text-gray-400 transition-all group-hover:text-black" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
