import { Plus } from "lucide-react";
import DomainSelector from "./domain-selector";
import TagSelector from "./tag-selector";
import useDomains from "@/lib/swr/use-domains";

export default function FilterBar() {
  const { allDomains } = useDomains();
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 min-[550px]:w-auto lg:flex">
      {allDomains.length > 0 && <DomainSelector />}
      <TagSelector />
    </div>
  );
}
