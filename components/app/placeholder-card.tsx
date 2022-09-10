import { motion } from "framer-motion";
import { FRAMER_MOTION_LIST_ITEM_VARIANTS } from "@/lib/constants";

export default function PlaceholderCard() {
  return (
    <motion.li
      variants={FRAMER_MOTION_LIST_ITEM_VARIANTS}
      className="flex items-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-black p-4 rounded-md transition-all"
    >
      <div className="w-10 h-10 rounded-full mr-2 bg-gray-200 dark:bg-gray-600 animate-pulse" />
      <div>
        <div className="flex items-center space-x-2 mb-2.5">
          <div className="w-28 h-5 rounded-md bg-gray-200 dark:bg-gray-600 animate-pulse" />
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
          <div className="w-20 h-5 rounded-md bg-gray-200 dark:bg-gray-600 animate-pulse" />
        </div>
        <div className="w-72 h-4 rounded-md bg-gray-200 dark:bg-gray-600 animate-pulse" />
      </div>
    </motion.li>
  );
}
