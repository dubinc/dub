import { Plus } from "lucide-react";
import DomainSelector from "./domain-selector";
import TagSelector from "./tag-selector";

export default function FilterBar() {
  return (
    <div className="flex w-full max-w-lg gap-1 rounded-lg bg-gray-100 p-1">
      <DomainSelector />
      <TagSelector />
      <button className="flex items-center justify-center gap-2 truncate rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-400">
        <Plus className="h-5 w-5 flex-shrink-0 text-black" />
        Add filter
      </button>
    </div>
  );
}
