import useLinksCount from "@/lib/swr/use-links-count";
import { useRouterStuff } from "@dub/ui";
import { Archive } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ArchivedLinksHint() {
  const searchParams = useSearchParams();
  const showArchived = searchParams.get("showArchived") === "true";

  // only show the hint if there filters but showArchived is false
  return searchParams.size > 0 && !showArchived && <ArchivedLinksHintHelper />;
}

function ArchivedLinksHintHelper() {
  const { data: count } = useLinksCount({ showArchived: true });
  const { queryParams } = useRouterStuff();

  return (
    count > 0 && (
      <li className="flex items-center rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500 ring-2 ring-gray-50 transition-all sm:p-4">
        <Archive className="mr-2 h-4 w-4" />
        <p>You have {count} archived links that match your filters.</p>
        <button
          className="ml-1 font-medium underline underline-offset-2 hover:text-gray-800"
          onClick={() =>
            queryParams({
              set: {
                showArchived: "true",
              },
            })
          }
        >
          Show archived links?
        </button>
      </li>
    )
  );
}
