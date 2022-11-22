import { useRouter } from "next/router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Filter } from "@/components/shared/icons";
import { SWIPE_REVEAL_ANIMATION_SETTINGS } from "@/lib/constants";
import LinkSort from "./link-sort";
import StatusFilter from "./status-filter";
import UserFilter from "./user-filter";

export default function LinkFilters() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };
  const [showFilters, setShowFilters] = useState(false);
  return (
    <>
      {/* Mobile filters */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="my-5 flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 sm:hidden"
      >
        <div className="flex items-center space-x-2 text-gray-700">
          <Filter className="h-4 w-4 shrink-0" />
          <p className="text-sm">Filters</p>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 ${
            showFilters ? "rotate-180 transform" : ""
          } transition-all duration-75`}
        />
      </button>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="flex w-full flex-col space-y-2 border-t border-gray-200 py-5 sm:hidden"
            {...SWIPE_REVEAL_ANIMATION_SETTINGS}
          >
            <LinkSort />
            <StatusFilter />
            {slug && <UserFilter />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop filters */}
      <div className="my-5 hidden w-full justify-end sm:flex">
        <LinkSort />
        {/* Weird workaround because if I put `space-x-2` in the parent it misaligns the popover dropdown */}
        <div className="w-4" />
        <StatusFilter />
        {slug && (
          <>
            <div className="w-4" />
            <UserFilter />
          </>
        )}
      </div>
    </>
  );
}
