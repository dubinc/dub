"use client";
import { Search } from "lucide-react";
import { useContext } from "react";
import { AppContext } from "app/providers";

export default function SearchButton() {
  const { setShowCMDK } = useContext(AppContext);
  return (
    <button
      onClick={() => setShowCMDK(true)}
      className="group relative flex focus:outline-none"
    >
      <Search className="absolute inset-y-0 left-4 z-10 my-auto h-4 w-4 text-gray-500" />
      <div className="w-full rounded-xl border border-gray-200 bg-white p-3 pl-12 text-left text-gray-500 transition-colors group-active:bg-gray-50">
        Search for articles...
      </div>
      <span className="absolute inset-y-0 right-4 my-auto h-5 text-sm text-gray-400">
        ⌘K
      </span>
    </button>
  );
}
