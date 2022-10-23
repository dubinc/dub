import { useRouter } from "next/router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Filter } from "@/components/shared/icons";
import { AnimationSettings } from "../../modals/add-edit-link-modal/advanced-settings";
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
        className="flex justify-between items-center space-x-2 sm:hidden bg-white w-full my-5 px-3 py-2.5 rounded-md shadow hover:shadow-md active:scale-95 transition-all duration-75"
      >
        <div className="flex items-center space-x-2 text-gray-700">
          <Filter className="h-4 w-4 shrink-0" />
          <p className="text-sm">Filters</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 ${
            showFilters ? "transform rotate-180" : ""
          } transition-all duration-75`}
        />
      </button>
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="border-t border-gray-200 w-full flex flex-col space-y-2 py-5 sm:hidden"
            {...AnimationSettings}
          >
            <LinkSort />
            <StatusFilter />
            {slug && <UserFilter />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop filters */}
      <div className="w-full my-5 hidden sm:flex justify-end">
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
