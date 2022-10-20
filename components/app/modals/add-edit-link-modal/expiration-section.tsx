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
        <label htmlFor="expiresAt" className="block my-2 text-sm text-gray-500">
          Automatically expires your link at a given date and time. Your link
          will be disabled but the data will still be kept.
        </label>
        <div className="flex space-x-2 mb-3">
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
            className="flex space-x-2 justify-center items-center rounded-md shadow-sm border border-gray-300 text-gray-500 hover:border-gray-800 px-3 py-2 w-full focus:outline-none sm:text-sm transition-all"
          />
          <button
            onClick={() => setData({ ...data, expiresAt: null })}
            type="button"
            className="group rounded-md border w-10 h-10 flex justify-center items-center text-gray-500 hover:text-gray-800 hover:border-gray-800 focus:outline-none transition-all"
          >
            <X className="text-gray-400 w-4 h-4 group-hover:text-black transition-all" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
