import { Plus } from "lucide-react";
import DomainSelector from "./domain-selector";
import TagSelector from "./tag-selector";

export default function FilterBar() {
  return (
    <div className="flex w-full max-w-lg gap-1 rounded-lg bg-gray-100 p-1">
      <TagSelector />
      <DomainSelector />
      <button className="flex w-10 items-center justify-center rounded-lg border border-gray-200 bg-white p-2">
        <Plus className="h-5 w-5 text-black" />
      </button>
    </div>
  );
}
