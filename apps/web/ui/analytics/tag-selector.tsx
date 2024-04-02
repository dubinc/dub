import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { InputSelect, useRouterStuff } from "@dub/ui";
import { Tag } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TagSelector() {
  const router = useRouter();
  const { queryParams } = useRouterStuff();
  const { slug } = useWorkspace();

  const { tags } = useTags();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams?.get("tagId");

  return (
    <InputSelect
      adjustForMobile
      disabled={!tags}
      items={
        tags?.map(({ id, name, color }) => ({
          id,
          color,
          value: name,
        })) || []
      }
      icon={<Tag className="h-4 w-4 text-black" />}
      selectedItem={{
        id: selectedTagId!,
        value: tags?.find(({ id }) => id === selectedTagId)?.name || "",
        color: tags?.find(({ id }) => id === selectedTagId)?.color,
      }}
      setSelectedItem={(tag) => {
        if (tag && typeof tag !== "function" && tag.id)
          router.push(
            queryParams({
              set: { tagId: tag.id },
              getNewPath: true,
            }) as string,
          );
        else
          router.push(
            queryParams({ del: "tagId", getNewPath: true }) as string,
          );
      }}
      inputAttrs={{
        placeholder: "Filter tags",
      }}
      className="lg:w-48"
      noItemsElement={
        <div>
          <h4 className="mb-2 px-2 py-2 text-sm text-gray-600">
            No tags found in this workspace
          </h4>
          <button
            type="button"
            className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
            onClick={() => router.push(`/${slug}?create=tag`)}
          >
            Add a tag
          </button>
        </div>
      }
    />
  );
}
