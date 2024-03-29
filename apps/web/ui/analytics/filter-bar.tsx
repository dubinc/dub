import { Plus } from "lucide-react";
import DomainSelector from "./domain-selector";
import TagSelector from "./tag-selector";
import useDomains from "@/lib/swr/use-domains";

export default function FilterBar() {
  const { allDomains } = useDomains();
  return (
    <div className="flex w-full flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {allDomains.length > 0 && <DomainSelector />}
      <TagSelector />
      <button className="flex items-center justify-center gap-2 truncate rounded-md border border-gray-300 bg-white py-2 pl-2 pr-4 text-sm text-gray-400 sm:border-gray-200">
        <Plus className="h-4 w-4 flex-shrink-0 text-black" />
        <span>Add Filter</span>
      </button>
    </div>
  );
}
